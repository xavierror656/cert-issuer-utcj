<?php
require_once(__DIR__ . '/../../config.php');
require_once($CFG->libdir . '/adminlib.php');
require_once(__DIR__ . '/lib.php');

$id = required_param('id', PARAM_INT);
$course = $DB->get_record('course', array('id' => $id), '*', MUST_EXIST);
$context = context_course::instance($course->id);

require_login($course);
require_capability('local/certsigner:issue', $context);

$PAGE->set_url('/local/certsigner/issue.php', array('id' => $id));
$PAGE->set_context($context);
$PAGE->set_title(get_string('pluginname', 'local_certsigner'));
$PAGE->set_heading($course->fullname);

list($apiurl, $apikey) = certsigner_get_api_config();

$action = optional_param('action', '', PARAM_ALPHA);
$notice = '';
$noticetype = 'notifysuccess';

// Handle Revocation Action - POST only (fix GET csrf)
if ($action === 'revoke' && confirm_sesskey()) {
    require_sesskey();
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        $notice = 'Revocación debe ser POST.';
        $noticetype = 'notifyproblem';
    } else {
        $cert_id = required_param('certid', PARAM_ALPHANUMEXT);
        list($httpcode, $resp, $decoded, $detail) = certsigner_api_call('/certificate/' . $cert_id . '/revoke', ['reason' => 'Revocado desde Moodle por el Administrador'], 'POST', 30);
        if ($httpcode >= 200 && $httpcode < 300) {
            // Soft revoke: keep audit trail.
            $DB->set_field('certsigner_issued', 'status', 'revoked', ['certificateid' => $cert_id]);
            $DB->set_field('certsigner_issued', 'timerevoked', time(), ['certificateid' => $cert_id]);
            $notice = "Microcredencial " . s($cert_id) . " revocada en Blockchain (conservada para auditoría).";
        } else {
            // Even if API fails, mark revoked locally to avoid reuse, but warn.
            $notice = "Error al revocar en Blockchain (HTTP $httpcode): " . s($detail ?: substr($resp,0,400));
            $noticetype = 'notifyproblem';
        }
    }
}

// Handle Batch Issuance Action
if ($action === 'issue' && confirm_sesskey()) {
    if (empty($apikey)) {
        $notice = 'Configura API Key en Administración > Plugins > CertSigner antes de emitir.';
        $noticetype = 'notifyproblem';
    } else {
        $userids = optional_param_array('userids', array(), PARAM_INT);
        if (!empty($userids)) {
            $issued_count = 0;
            $chain = get_config('local_certsigner', 'chain_default') ?: 'ethereum_sepolia';
            if (count($userids) > 1) {
                $batch_certs = array();
                $uid_map = array();
                foreach ($userids as $uid) {
                    $user = $DB->get_record('user', array('id' => $uid));
                    if (!$user) continue;
                    $full_name = fullname($user);
                    $name_parts = explode(' ', trim($full_name), 2);
                    $given_name = $name_parts[0];
                    $family_name = isset($name_parts[1]) && !empty($name_parts[1]) ? $name_parts[1] : $name_parts[0];
                    $batch_certs[] = array(
                        'recipient' => array('given_name' => $given_name, 'family_name' => $family_name, 'email' => $user->email),
                        'credential' => array('title' => $course->fullname, 'description' => 'Certificado de finalización del curso ' . $course->fullname . ' emitido por la UTCJ.', 'issue_date' => date('Y-m-d'), 'course_name' => $course->fullname, 'hours' => 120, 'skills' => array('Competencias Profesionales', 'Conocimientos Especializados'), 'grade' => 'Aprobado'),
                        'issuer' => array('name' => get_config('local_certsigner', 'issuer_name_default') ?: 'Universidad Tecnologica de Ciudad Juarez', 'id' => get_config('local_certsigner', 'issuer_id_default') ?: 'https://www.utcj.edu.mx')
                    );
                    $uid_map[] = $uid;
                }
                $payload = array('certificates' => $batch_certs, 'chain' => $chain);
                list($httpcode, $resp, $resdata, $detail) = certsigner_api_call('/issue-batch', $payload, 'POST', 60);
                if ($httpcode == 200 || $httpcode == 201) {
                    $items = isset($resdata['items']) ? $resdata['items'] : array();
                    foreach ($items as $idx => $item) {
                        $certid = isset($item['id']) ? $item['id'] : '';
                        $uid = isset($uid_map[$idx]) ? $uid_map[$idx] : null;
                        if ($certid && $uid) {
                            $rec = new stdClass();
                            $rec->courseid = $course->id;
                            $rec->userid = $uid;
                            $rec->certificateid = $certid;
                            $rec->certificateurl = $apiurl . '/render/' . $certid;
                            $rec->pdfurl = $apiurl . '/certificate/' . $certid . '/pdf';
                            $rec->timeissued = time();
                            $rec->status = 'active';
                            $DB->insert_record('certsigner_issued', $rec);
                            certsigner_issue_moodle_badge($course->id, $uid, $certid, $course->fullname);
                            $issued_count++;
                        }
                    }
                    if ($issued_count > 0) {
                        $tx = isset($resdata['transaction_id']) ? substr($resdata['transaction_id'],0,10).'...' : '';
                        $notice = "Se emitieron {$issued_count} microcredencial(es) en 1 tx batch {$tx} en {$chain}.";
                    }
                } else {
                    $notice = "Error Blockchain batch (HTTP $httpcode): " . s($detail ?: substr($resp, 0, 400));
                    $noticetype = 'notifyproblem';
                }
            } else {
                foreach ($userids as $uid) {
                    $user = $DB->get_record('user', array('id' => $uid));
                    if (!$user) continue;
                    $full_name = fullname($user);
                    $name_parts = explode(' ', trim($full_name), 2);
                    $given_name = $name_parts[0];
                    $family_name = isset($name_parts[1]) && !empty($name_parts[1]) ? $name_parts[1] : $name_parts[0];
                    $payload = array(
                        'recipient' => array('given_name' => $given_name, 'family_name' => $family_name, 'email' => $user->email),
                        'credential' => array('title' => $course->fullname, 'description' => 'Certificado de finalización del curso ' . $course->fullname . ' emitido por la UTCJ.', 'issue_date' => date('Y-m-d'), 'course_name' => $course->fullname, 'hours' => 120, 'skills' => array('Competencias Profesionales', 'Conocimientos Especializados'), 'grade' => 'Aprobado'),
                        'issuer' => array('name' => get_config('local_certsigner', 'issuer_name_default') ?: 'Universidad Tecnologica de Ciudad Juarez', 'id' => get_config('local_certsigner', 'issuer_id_default') ?: 'https://www.utcj.edu.mx'),
                        'chain' => $chain
                    );
                    list($httpcode, $resp, $resdata, $detail) = certsigner_api_call('/issue', $payload, 'POST', 30);
                    if ($httpcode == 200 || $httpcode == 201) {
                        $certid = isset($resdata['id']) ? $resdata['id'] : (isset($resdata['certificate_id']) ? $resdata['certificate_id'] : '');
                        if ($certid) {
                            $rec = new stdClass();
                            $rec->courseid = $course->id;
                            $rec->userid = $user->id;
                            $rec->certificateid = $certid;
                            $rec->certificateurl = $apiurl . '/render/' . $certid;
                            $rec->pdfurl = $apiurl . '/certificate/' . $certid . '/pdf';
                            $rec->timeissued = time();
                            $rec->status = 'active';
                            $DB->insert_record('certsigner_issued', $rec);
                            certsigner_issue_moodle_badge($course->id, $user->id, $certid, $course->fullname);
                            $issued_count++;
                        }
                    } else {
                        debugging("certsigner issue failed for user {$user->email} (chain {$payload['chain']}): HTTP $httpcode - $detail", DEBUG_DEVELOPER);
                        if ($issued_count == 0 && $uid == end($userids)) {
                            $notice = "Error Blockchain (HTTP $httpcode): " . s($detail) . " Verifica chain ethereum_sepolia o fondea wallet.";
                            $noticetype = 'notifyproblem';
                        }
                    }
                }
                if (empty($notice) || $noticetype === 'notifyproblem') {
                    if ($issued_count > 0 && strpos($notice, 'batch') === false) {
                        $notice = "Se emitieron {$issued_count} microcredencial(es) en Blockchain.";
                        $noticetype = 'notifysuccess';
                    }
                }
            }
        }
    }
}

echo $OUTPUT->header();
if (empty($apikey)) {
    echo $OUTPUT->notification('API Key no configurada. Configura en Administración > Plugins > Plugins locales > CertSigner.', 'notifyproblem');
}
echo '<div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">';
echo $OUTPUT->heading(get_string('pluginname', 'local_certsigner') . ' — ' . $course->fullname);
echo '<div class="d-flex gap-2 ms-auto">';
echo '<a href="'.$CFG->wwwroot.'/local/certsigner/download_batch_zip.php?id=' . $course->id . '" class="btn btn-secondary">Descargar ZIP</a>';
echo '<a href="'.$CFG->wwwroot.'/local/certsigner/reports.php" class="btn btn-primary">Dashboard</a>';
echo '</div>';
echo '</div>';

if ($notice) {
    echo $OUTPUT->notification($notice, $noticetype);
}

$enrolled = get_enrolled_users($context);
$already_issued = array();
try {
    // Only active certs count as issued; revoked are available again but show badge.
    $already_issued = $DB->get_records_menu('certsigner_issued', array('courseid' => $course->id, 'status' => 'active'), '', 'userid, certificateid');
    $revoked = $DB->get_records_menu('certsigner_issued', array('courseid' => $course->id, 'status' => 'revoked'), '', 'userid, certificateid');
} catch (Exception $e) {
    $already_issued = array();
    $revoked = array();
}

echo '<div class="d-flex gap-2 mb-3 flex-wrap">';
echo '<input type="search" id="certsigner-search" class="form-control" style="max-width:320px" placeholder="Buscar estudiante o correo...">';
echo '<select id="certsigner-filter" class="form-select" style="max-width:200px"><option value="all">Todos</option><option value="pending">Pendientes</option><option value="issued">Emitidos</option><option value="revoked">Revocados</option></select>';
echo '<span id="certsigner-count" class="badge bg-info align-self-center"></span>';
echo '</div>';

echo '<form method="post" action="issue.php?id=' . $course->id . '" id="certsigner-form">';
echo '<input type="hidden" name="sesskey" value="' . sesskey() . '">';
echo '<input type="hidden" name="action" value="issue">';
echo '<div class="table-responsive">';
echo '<table class="generaltable table table-hover" style="width:100%;" id="certsigner-table">';
echo '<thead><tr class="table-light">
    <th><input type="checkbox" id="select-all"></th>
    <th>Estudiante</th>
    <th>Correo</th>
    <th>Estatus</th>
    <th>Acciones</th>
</tr></thead><tbody>';

foreach ($enrolled as $u) {
    $has_cert = isset($already_issued[$u->id]);
    $is_revoked = isset($revoked[$u->id]);
    $cert_id = $has_cert ? $already_issued[$u->id] : ($is_revoked ? $revoked[$u->id] : '');

    $rowclass = $has_cert ? 'issued' : ($is_revoked ? 'revoked' : 'pending');
    echo '<tr data-status="'.$rowclass.'" data-search="'.s(fullname($u).' '.$u->email).'">';
    echo '<td><input type="checkbox" name="userids[]" value="' . $u->id . '" ' . ($has_cert ? 'disabled' : '') . '></td>';
    echo '<td class="fw-bold">' . s(fullname($u)) . '</td>';
    echo '<td>' . s($u->email) . '</td>';

    if ($has_cert) {
        echo '<td><span class="badge bg-success">Emitido</span></td>';
        echo '<td>
            <div class="d-flex gap-1 flex-wrap">
                <a href="' . s($apiurl . '/render/' . $cert_id) . '" target="_blank" class="btn btn-sm btn-primary">Ver</a>
                <div class="btn-group">
                  <button type="button" class="btn btn-sm btn-secondary dropdown-toggle" data-bs-toggle="dropdown">Más</button>
                  <ul class="dropdown-menu">
                    <li><a class="dropdown-item" href="' . s($apiurl . '/certificate/' . $cert_id . '/pdf') . '" target="_blank">PDF Oficial</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li>
                      <form method="post" action="issue.php?id='.$course->id.'" onsubmit="return confirm(\'¿Revocar esta credencial? Quedará marcada como revocada para auditoría.\');">
                        <input type="hidden" name="sesskey" value="'.sesskey().'">
                        <input type="hidden" name="action" value="revoke">
                        <input type="hidden" name="certid" value="'.s($cert_id).'">
                        <button type="submit" class="dropdown-item text-danger">Revocar</button>
                      </form>
                    </li>
                  </ul>
                </div>
            </div>
        </td>';
    } else if ($is_revoked) {
        echo '<td><span class="badge bg-danger">Revocado</span></td>';
        echo '<td class="text-muted small">Revocado — puede re-emitir</td>';
    } else {
        echo '<td><span class="badge bg-warning text-dark">Pendiente</span></td>';
        echo '<td class="text-muted small">Listo para firmar</td>';
    }
    echo '</tr>';
}

echo '</tbody></table>';
echo '</div>';

echo '<div class="mt-3">';
echo '<button type="submit" id="issue-btn" class="btn btn-primary">Firmar y Emitir a Seleccionados</button> <span id="selected-count" class="text-muted small ms-2"></span>';
echo '</div>';
echo '</form>';

echo '<script>
document.getElementById("select-all")?.addEventListener("change", function(){
  document.querySelectorAll("input[name=\'userids[]\']:not(:disabled)").forEach(c=>c.checked=this.checked);
  updateCount();
});
document.querySelectorAll("input[name=\'userids[]\']").forEach(c=>c.addEventListener("change", updateCount));
function updateCount(){
  var n=document.querySelectorAll("input[name=\'userids[]\']:checked").length;
  var el=document.getElementById("selected-count");
  if(el) el.textContent=n? n+" seleccionados":"";
  var btn=document.getElementById("issue-btn");
  if(btn) btn.disabled=false;
}
document.getElementById("certsigner-form")?.addEventListener("submit", function(){
  var btn=document.getElementById("issue-btn");
  if(btn){ btn.disabled=true; btn.textContent="Firmando..."; }
});
var search=document.getElementById("certsigner-search");
var filter=document.getElementById("certsigner-filter");
function applyFilters(){
  var q=(search.value||"").toLowerCase();
  var f=filter.value;
  var rows=document.querySelectorAll("#certsigner-table tbody tr");
  var vis=0;
  rows.forEach(r=>{
    var matchSearch=!q || r.dataset.search.toLowerCase().includes(q);
    var matchFilter=f==="all" || r.dataset.status===f;
    var show=matchSearch && matchFilter;
    r.style.display=show?"":"none";
    if(show) vis++;
  });
  var c=document.getElementById("certsigner-count");
  if(c) c.textContent=vis+" / "+rows.length;
}
search?.addEventListener("input", applyFilters);
filter?.addEventListener("change", applyFilters);
applyFilters();
updateCount();
</script>';

echo $OUTPUT->footer();

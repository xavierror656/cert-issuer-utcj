<?php
require_once(__DIR__ . '/../../config.php');
require_once($CFG->libdir . '/adminlib.php');

$id = required_param('id', PARAM_INT);
$course = $DB->get_record('course', array('id' => $id), '*', MUST_EXIST);
$context = context_course::instance($course->id);

require_login($course);
require_capability('moodle/course:update', $context);

$PAGE->set_url('/local/certsigner/issue.php', array('id' => $id));
$PAGE->set_context($context);
$PAGE->set_title(get_string('pluginname', 'local_certsigner'));
$PAGE->set_heading($course->fullname);

$apiurl = get_config('local_certsigner', 'api_base_url');
if (empty($apiurl)) {
    $apiurl = 'https://utcjmicro.javierflores.software';
}
$apiurl = rtrim($apiurl, '/');

$apikey = get_config('local_certsigner', 'api_key');
if (empty($apikey)) {
    $apikey = 'issuersecretkey';
}

$action = optional_param('action', '', PARAM_ALPHA);
$notice = '';

if ($action === 'issue' && confirm_sesskey()) {
    $userids = optional_param_array('userids', array(), PARAM_INT);
    if (!empty($userids)) {
        $issued_count = 0;
        foreach ($userids as $uid) {
            $user = $DB->get_record('user', array('id' => $uid));
            if (!$user) continue;

            // Prepare API payload
            $payload = array(
                'recipient_name' => fullname($user),
                'recipient_email' => $user->email,
                'credential_title' => $course->fullname . ' certificate',
                'course_name' => $course->fullname,
                'hours' => 120,
                'grade' => 'Aprobado',
                'chain' => get_config('local_certsigner', 'chain_default') ?: 'ethereum_mainnet',
                'issuer' => array(
                    'name' => get_config('local_certsigner', 'issuer_name_default') ?: 'Universidad Tecnologica de Ciudad Juarez',
                    'id' => get_config('local_certsigner', 'issuer_id_default') ?: 'https://www.utcj.edu.mx'
                )
            );

            // Call API
            $ch = curl_init($apiurl . '/issue');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            curl_setopt($ch, CURLOPT_HTTPHEADER, array(
                'Content-Type: application/json',
                'X-API-Key: ' . $apikey
            ));
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);
            $resp = curl_exec($ch);
            $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpcode == 200 || $httpcode == 201) {
                $resdata = json_decode($resp, true);
                $certid = isset($resdata['id']) ? $resdata['id'] : (isset($resdata['certificate_id']) ? $resdata['certificate_id'] : '');
                if ($certid) {
                    $rec = new stdClass();
                    $rec->courseid = $course->id;
                    $rec->userid = $user->id;
                    $rec->certificateid = $certid;
                    $rec->certificateurl = $apiurl . '/render/' . $certid;
                    $rec->pdfurl = $apiurl . '/certificate/' . $certid . '/pdf';
                    $rec->timeissued = time();
                    $DB->insert_record('certsigner_issued', $rec);
                    $issued_count++;
                }
            }
        }
        $notice = "Se emitieron exitosamente {$issued_count} microcredencial(es) en Blockchain.";
    }
}

echo $OUTPUT->header();
echo $OUTPUT->heading(get_string('pluginname', 'local_certsigner') . ' — ' . $course->fullname);

if ($notice) {
    echo $OUTPUT->notification($notice, 'notifysuccess');
}

// Fetch enrolled users
$enrolled = get_enrolled_users($context);
$already_issued = $DB->get_records_menu('certsigner_issued', array('courseid' => $course->id), '', 'userid, certificateid');
$issued_records = $DB->get_records('certsigner_issued', array('courseid' => $course->id));

echo '<form method="post" action="issue.php?id=' . $course->id . '">';
echo '<input type="hidden" name="sesskey" value="' . sesskey() . '">';
echo '<input type="hidden" name="action" value="issue">';

echo '<table class="generaltable" style="width:100%; border-collapse:collapse; margin-top:20px;">';
echo '<thead><tr style="background:#f4f6f8; text-align:left;">
    <th style="padding:10px;"><input type="checkbox" onclick="toggleSelectAll(this)"></th>
    <th style="padding:10px;">Estudiante</th>
    <th style="padding:10px;">Correo Electrónico</th>
    <th style="padding:10px;">Estatus Emisión</th>
    <th style="padding:10px;">Acciones / Certificado Firmado</th>
</tr></thead><tbody>';

foreach ($enrolled as $u) {
    $has_cert = isset($already_issued[$u->id]);
    $cert_id = $has_cert ? $already_issued[$u->id] : '';

    echo '<tr style="border-bottom:1px solid #eee;">';
    echo '<td style="padding:10px;"><input type="checkbox" name="userids[]" value="' . $u->id . '" ' . ($has_cert ? 'disabled' : '') . '></td>';
    echo '<td style="padding:10px; font-weight:bold;">' . fullname($u) . '</td>';
    echo '<td style="padding:10px;">' . $u->email . '</td>';
    
    if ($has_cert) {
        echo '<td style="padding:10px;"><span class="badge badge-success" style="background:#28a745; color:white; padding:4px 8px; border-radius:4px;">Emitido</span></td>';
        echo '<td style="padding:10px;">
            <div style="display:flex; gap:8px;">
                <a href="' . $apiurl . '/render/' . $cert_id . '" target="_blank" class="btn btn-sm btn-primary" style="background-color:#0F6A52; border-color:#0F6A52; color:white; font-weight:bold; padding:4px 10px; text-decoration:none; border-radius:4px;">📄 Ver Certificado Firmado</a>
                <a href="' . $apiurl . '/certificate/' . $cert_id . '/pdf" target="_blank" class="btn btn-sm btn-secondary" style="background-color:#0F3E4A; border-color:#0F3E4A; color:white; padding:4px 10px; text-decoration:none; border-radius:4px;">📥 PDF Oficial</a>
            </div>
        </td>';
    } else {
        echo '<td style="padding:10px;"><span class="badge badge-warning" style="background:#ffc107; color:#212529; padding:4px 8px; border-radius:4px;">Pendiente de Emisión</span></td>';
        echo '<td style="padding:10px; color:#6c757d; font-size:12px;">Listo para firmar</td>';
    }
    echo '</tr>';
}

echo '</tbody></table>';

echo '<div style="margin-top:20px;">';
echo '<button type="submit" class="btn btn-primary" style="background-color:#0F6A52; border-color:#0F6A52; color:white; font-weight:bold; padding:10px 20px; font-size:14px; border-radius:6px; cursor:pointer;">🎓 Firmar y Emitir Microcredencial a Seleccionados</button>';
echo '</div>';

echo '</form>';

echo '<script>
function toggleSelectAll(master) {
    var checkboxes = document.querySelectorAll("input[name=\'userids[]\']");
    for (var i = 0; i < checkboxes.length; i++) {
        if (!checkboxes[i].disabled) {
            checkboxes[i].checked = master.checked;
        }
    }
}
</script>';

echo $OUTPUT->footer();

<?php
require_once(__DIR__ . '/../../config.php');
require_once(__DIR__ . '/lib.php');
require_login();

$context = context_system::instance();
$PAGE->set_url('/local/certsigner/mycertificates.php');
$PAGE->set_context($context);
$PAGE->set_title('Mis Microcredenciales UTCJ');
$PAGE->set_heading('Mis Microcredenciales UTCJ');

list($apiurl, $apikey) = certsigner_get_api_config();

// Only active certs.
$my_certs = $DB->get_records('certsigner_issued', array('userid' => $USER->id, 'status' => 'active'), 'timeissued DESC');
if (empty($my_certs)) {
    // Fallback for legacy rows without status.
    $all = $DB->get_records('certsigner_issued', array('userid' => $USER->id), 'timeissued DESC');
    $my_certs = array_filter($all, fn($c) => !isset($c->status) || $c->status === 'active');
}

echo $OUTPUT->header();
echo '<div class="container" style="max-width:980px;">';
echo '<div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">';
echo '<div><h2 class="text-success fw-bold m-0">Mis Microcredenciales Verificables</h2><p class="text-muted small m-0">Consulta, comparte en LinkedIn y descarga tus certificados Blockchain UTCJ.</p></div>';
echo '<span class="badge bg-success bg-opacity-10 text-success border border-success px-3 py-2">Blockchain Verified</span>';
echo '</div>';

if (empty($my_certs)) {
    echo '<div class="card text-center py-5"><div class="card-body"><h4 class="fw-bold mt-2">Aún no tienes microcredenciales</h4><p class="text-muted small">Aparecerán aquí cuando la UTCJ emita tu certificado.</p><a href="'.$CFG->wwwroot.'/course/index.php" class="btn btn-primary btn-sm">Ver cursos disponibles</a></div></div>';
} else {
    echo '<div class="row g-3">';
    foreach ($my_certs as $c) {
        $course = $DB->get_record('course', array('id' => $c->courseid));
        $coursename = $course ? $course->fullname : 'Curso UTCJ';
        $issued_date = date('d/m/Y', $c->timeissued);
        $issue_year = date('Y', $c->timeissued);
        $issue_month = date('m', $c->timeissued);

        $cert_url = !empty($c->certificateurl) ? $c->certificateurl : ($apiurl . '/render/' . $c->certificateid);
        $pdf_url = !empty($c->pdfurl) ? $c->pdfurl : ($apiurl . '/certificate/' . $c->certificateid . '/pdf');
        $openbadge_url = $apiurl . '/certificate/' . $c->certificateid . '/openbadge';

        $linkedin_url = 'https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME'
            . '&name=' . urlencode($coursename)
            . '&organizationName=' . urlencode('Universidad Tecnologica de Ciudad Juarez')
            . '&issueYear=' . $issue_year
            . '&issueMonth=' . $issue_month
            . '&certUrl=' . urlencode($cert_url)
            . '&certId=' . urlencode($c->certificateid);

        $constancia_url = $apiurl . '/certificate/' . $c->certificateid . '/constancia-pdf';

        echo '<div class="col-md-6 col-lg-4">';
        echo '<div class="card h-100 shadow-sm">';
        echo '<div class="card-body d-flex flex-column">';
        echo '<div class="d-flex justify-content-between align-items-start mb-2">';
        echo '<span class="badge bg-success bg-opacity-10 text-success small text-uppercase">Blockchain Verified</span>';
        // Lazy QR: use API if available, fallback to external only if needed - ponytail: external QR if local not available
        echo '<img src="'.$apiurl.'/qr?data='.urlencode($cert_url).'" onerror="this.src=\'https://api.qrserver.com/v1/create-qr-code/?size=80x80&data='.urlencode($cert_url).'\'" alt="QR" style="width:54px;height:54px" class="border rounded p-1">';
        echo '</div>';
        echo '<h6 class="fw-bold mb-1">'.s($coursename).'</h6>';
        echo '<p class="text-muted small mb-3">UTCJ • '.$issued_date.'</p>';
        echo '<div class="mt-auto d-flex flex-column gap-2">';
        echo '<a href="'.$linkedin_url.'" target="_blank" class="btn btn-sm text-white" style="background:#0077b5">Añadir a LinkedIn</a>';
        echo '<div class="d-flex gap-2">';
        echo '<a href="'.s($cert_url).'" target="_blank" class="btn btn-sm btn-success flex-fill">Ver Diploma</a>';
        echo '<a href="'.s($pdf_url).'" target="_blank" class="btn btn-sm btn-dark flex-fill">Descargar PDF</a>';
        echo '</div>';
        echo '<div class="btn-group">';
        echo '<button class="btn btn-sm btn-outline-secondary dropdown-toggle w-100" data-bs-toggle="dropdown">Opciones / Constancia</button>';
        echo '<ul class="dropdown-menu w-100">';
        echo '<li><a class="dropdown-item" href="'.s($constancia_url).'" target="_blank">Constancia Oficial (PDF)</a></li>';
        echo '<li><a class="dropdown-item" href="#" onclick="navigator.clipboard.writeText(\''.s($cert_url).'\');alert(\'Link copiado al portapapeles\');return false;">Copiar link verificable</a></li>';
        echo '<li><a class="dropdown-item" href="'.s($openbadge_url).'" target="_blank">Open Badge v3</a></li>';
        echo '<li><a class="dropdown-item" href="'.s($cert_url).'" target="_blank">Verificación Blockchain</a></li>';
        echo '</ul>';
        echo '</div>';
        echo '</div>';
        echo '</div></div>';
        echo '</div>';
    }
    echo '</div>';
}

echo '</div>';
echo $OUTPUT->footer();

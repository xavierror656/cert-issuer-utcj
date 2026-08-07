<?php
require_once(__DIR__ . '/../../config.php');
require_login();

$context = context_system::instance();
$PAGE->set_url('/local/certsigner/mycertificates.php');
$PAGE->set_context($context);
$PAGE->set_title('Mis Microcredenciales UTCJ');
$PAGE->set_heading('Mis Microcredenciales UTCJ');

$apiurl = get_config('local_certsigner', 'api_base_url');
if (empty($apiurl)) {
    $apiurl = 'https://utcjmicro.javierflores.software';
}
$apiurl = rtrim($apiurl, '/');

// Fetch student's issued certificates
$my_certs = $DB->get_records('certsigner_issued', array('userid' => $USER->id), 'timeissued DESC');

echo $OUTPUT->header();
echo '<div style="max-width:960px; margin:0 auto; padding:10px;">';
echo '<h2 style="color:#0F6A52; font-weight:bold; margin-bottom:6px;">🎓 Mis Microcredenciales Verificables</h2>';
echo '<p style="color:#6c757d; font-size:14px; margin-bottom:24px;">Consulta y descarga tus certificados académicos emitidos y anclados criptográficamente en la Blockchain por la UTCJ.</p>';

if (empty($my_certs)) {
    echo '<div style="background:#f8f9fa; border:1px solid #dee2e6; border-radius:12px; padding:30px; text-align:center; color:#6c757d;">';
    echo '<span style="font-size:36px;">📜</span>';
    echo '<h4 style="margin-top:12px; color:#495057;">Aún no tienes microcredenciales emitidas</h4>';
    echo '<p style="font-size:13px; margin:0;">Cuando completes tus cursos y la UTCJ emita tu certificado, aparecerán en esta sección automáticamente.</p>';
    echo '</div>';
} else {
    echo '<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:20px;">';
    foreach ($my_certs as $c) {
        $course = $DB->get_record('course', array('id' => $c->courseid));
        $coursename = $course ? $course->fullname : 'Curso UTCJ';
        $issued_date = date('d/m/Y', $c->timeissued);
        $cert_url = !empty($c->certificateurl) ? $c->certificateurl : ($apiurl . '/render/' . $c->certificateid);
        $pdf_url = !empty($c->pdfurl) ? $c->pdfurl : ($apiurl . '/certificate/' . $c->certificateid . '/pdf');
        $verify_url = $apiurl . '/?id=' . $c->certificateid;

        echo '<div style="background:white; border:1px solid #e2e8f0; border-radius:16px; padding:20px; box-shadow:0 4px 12px rgba(0,0,0,0.05); display:flex; flex-direction:column; justify-content:space-between;">';
        echo '<div>';
        echo '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">';
        echo '<span style="background:rgba(15,106,82,0.1); color:#0F6A52; font-size:11px; font-weight:bold; padding:4px 10px; border-radius:20px;">Blockchain Verified</span>';
        echo '<span style="font-size:12px; color:#94a3b8; font-weight:500;">' . $issued_date . '</span>';
        echo '</div>';
        echo '<h4 style="color:#0F3E4A; font-weight:bold; font-size:16px; margin:8px 0;">' . htmlspecialchars($coursename) . '</h4>';
        echo '<p style="color:#64748b; font-size:12px; margin-bottom:16px;">Emisor: Universidad Tecnológica de Ciudad Juárez</p>';
        echo '</div>';
        
        echo '<div style="display:flex; flex-direction:column; gap:8px; margin-top:10px;">';
        echo '<a href="' . $cert_url . '" target="_blank" style="background:#0F6A52; color:white; text-align:center; padding:10px; border-radius:8px; text-decoration:none; font-weight:bold; font-size:13px;">📄 Ver Certificado Firmado</a>';
        echo '<a href="' . $pdf_url . '" target="_blank" style="background:#0F3E4A; color:white; text-align:center; padding:8px; border-radius:8px; text-decoration:none; font-size:12px; font-weight:bold;">📥 Descargar PDF Oficial</a>';
        echo '</div>';
        echo '</div>';
    }
    echo '</div>';
}

echo '</div>';
echo $OUTPUT->footer();

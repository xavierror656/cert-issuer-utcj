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
echo '<div style="max-width:980px; margin:0 auto; padding:10px;">';
echo '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">';
echo '<div>';
echo '<h2 style="color:#0F6A52; font-weight:bold; margin:0;">🎓 Mis Microcredenciales Verificables</h2>';
echo '<p style="color:#6c757d; font-size:14px; margin:4px 0 0 0;">Consulta, comparte en LinkedIn y descarga tus certificados académicos anclados en la Blockchain por la UTCJ.</p>';
echo '</div>';
echo '<span style="background:rgba(15,106,82,0.1); border:1px solid rgba(15,106,82,0.2); color:#0F6A52; font-weight:bold; font-size:12px; padding:6px 14px; border-radius:20px;">Ethereum Mainnet Verified</span>';
echo '</div>';

if (empty($my_certs)) {
    echo '<div style="background:#f8f9fa; border:1px solid #dee2e6; border-radius:16px; padding:40px; text-align:center; color:#6c757d;">';
    echo '<span style="font-size:48px;">📜</span>';
    echo '<h4 style="margin-top:14px; color:#495057; font-weight:bold;">Aún no tienes microcredenciales emitidas</h4>';
    echo '<p style="font-size:13px; margin:0;">Cuando completes tus cursos y la UTCJ emita tu certificado, aparecerán en esta sección automáticamente.</p>';
    echo '</div>';
} else {
    echo '<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap:20px;">';
    foreach ($my_certs as $c) {
        $course = $DB->get_record('course', array('id' => $c->courseid));
        $coursename = $course ? $course->fullname : 'Curso UTCJ';
        $issued_date = date('d/m/Y', $c->timeissued);
        $issue_year = date('Y', $c->timeissued);
        $issue_month = date('m', $c->timeissued);
        
        $cert_url = !empty($c->certificateurl) ? $c->certificateurl : ($apiurl . '/render/' . $c->certificateid);
        $pdf_url = !empty($c->pdfurl) ? $c->pdfurl : ($apiurl . '/certificate/' . $c->certificateid . '/pdf');
        $qr_url = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' . urlencode($cert_url);

        // LinkedIn Add to Profile URL
        $linkedin_url = 'https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME'
            . '&name=' . urlencode($coursename)
            . '&organizationName=' . urlencode('Universidad Tecnologica de Ciudad Juarez')
            . '&issueYear=' . $issue_year
            . '&issueMonth=' . $issue_month
            . '&certUrl=' . urlencode($cert_url)
            . '&certId=' . urlencode($c->certificateid);

        echo '<div style="background:white; border:1px solid #e2e8f0; border-radius:16px; padding:22px; box-shadow:0 4px 14px rgba(0,0,0,0.06); display:flex; flex-direction:column; justify-content:space-between; position:relative; overflow:hidden;">';
        
        echo '<div>';
        echo '<div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">';
        echo '<div>';
        echo '<span style="background:rgba(15,106,82,0.1); color:#0F6A52; font-size:10px; font-weight:bold; padding:3px 8px; border-radius:12px; text-transform:uppercase;">Blockchain Verified</span>';
        echo '<h4 style="color:#0F3E4A; font-weight:bold; font-size:16px; margin:8px 0 4px 0; line-height:1.3;">' . htmlspecialchars($coursename) . '</h4>';
        echo '<p style="color:#64748b; font-size:11px; margin:0;">Emisión oficial: UTCJ • ' . $issued_date . '</p>';
        echo '</div>';
        echo '<img src="' . $qr_url . '" alt="QR Verificación" style="width:54px; height:54px; border-radius:6px; border:1px solid #e2e8f0; padding:2px; background:white;">';
        echo '</div>';
        echo '</div>';
        
        echo '<div style="display:flex; flex-direction:column; gap:8px; margin-top:16px; border-t:1px solid #f1f5f9; padding-top:14px;">';
        echo '<a href="' . $linkedin_url . '" target="_blank" style="background:#0077b5; color:white; text-align:center; padding:9px; border-radius:8px; text-decoration:none; font-weight:bold; font-size:12px; display:flex; align-items:center; justify-content:center; gap:6px;">';
        echo '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.74a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24z"/></svg>';
        echo 'Añadir a mi perfil de LinkedIn</a>';
        
        echo '<div style="display:flex; gap:8px;">';
        echo '<a href="' . $cert_url . '" target="_blank" style="flex:1; background:#0F6A52; color:white; text-align:center; padding:8px; border-radius:8px; text-decoration:none; font-weight:bold; font-size:12px;">📄 Ver Certificado</a>';
        echo '<a href="' . $pdf_url . '" target="_blank" style="flex:1; background:#0F3E4A; color:white; text-align:center; padding:8px; border-radius:8px; text-decoration:none; font-weight:bold; font-size:12px;">📥 PDF Oficial</a>';
        echo '</div>';
        echo '</div>';
        
        echo '</div>';
    }
    echo '</div>';
}

echo '</div>';
echo $OUTPUT->footer();

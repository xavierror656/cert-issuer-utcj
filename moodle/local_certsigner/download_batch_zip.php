<?php
require_once(__DIR__ . '/../../config.php');
require_once($CFG->libdir . '/adminlib.php');
require_once(__DIR__ . '/lib.php');

$id = required_param('id', PARAM_INT);
$course = $DB->get_record('course', array('id' => $id), '*', MUST_EXIST);
$context = context_course::instance($course->id);

require_login($course);
require_capability('local/certsigner:issue', $context);

$certs = $DB->get_records('certsigner_issued', array('courseid' => $course->id, 'status' => 'active'));
if (empty($certs)) {
    // Also try legacy without status field.
    $certs = $DB->get_records('certsigner_issued', array('courseid' => $course->id));
    $certs = array_filter($certs, fn($c) => !isset($c->status) || $c->status === 'active');
}
if (empty($certs)) {
    print_error('noredirect', 'error', '', 'No hay certificados emitidos para este curso.');
}

list($apiurl, $apikey) = certsigner_get_api_config();

$temp_zip = tempnam(sys_get_temp_dir(), 'utcj_zip_');
$zip = new ZipArchive();
if ($zip->open($temp_zip, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
    print_error('noredirect', 'error', '', 'No se pudo generar el archivo ZIP.');
}

// ponytail: curl_multi para 20+ PDFs (secuencial bloquea timeout)
$mh = curl_multi_init();
$handles = [];
$meta = [];

foreach ($certs as $c) {
    $user = $DB->get_record('user', array('id' => $c->userid));
    $user_name = $user ? clean_filename(fullname($user)) : ('Alumno_' . $c->userid);
    $filename = "Certificado_UTCJ_{$user_name}_{$c->certificateid}.pdf";
    $pdf_url = $apiurl . '/certificate/' . $c->certificateid . '/pdf';

    $ch = curl_init($pdf_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    if (!empty($apikey)) {
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['X-API-Key: ' . $apikey]);
    }
    curl_multi_add_handle($mh, $ch);
    $handles[(int)$ch] = $ch;
    $meta[(int)$ch] = $filename;
}

do {
    curl_multi_exec($mh, $running);
    curl_multi_select($mh, 1);
} while ($running > 0);

foreach ($handles as $id => $ch) {
    $pdf_data = curl_multi_getcontent($ch);
    $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($httpcode == 200 && !empty($pdf_data)) {
        $zip->addFromString($meta[$id], $pdf_data);
    }
    curl_multi_remove_handle($mh, $ch);
    curl_close($ch);
}
curl_multi_close($mh);

$zip->close();

$zip_filename = "Expediente_Certificados_UTCJ_Curso_" . clean_filename($course->shortname) . ".zip";
header('Content-Type: application/zip');
header('Content-Disposition: attachment; filename="' . $zip_filename . '"');
header('Content-Length: ' . filesize($temp_zip));
readfile($temp_zip);
@unlink($temp_zip);
exit;

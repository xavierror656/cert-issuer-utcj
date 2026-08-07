<?php
require_once(__DIR__ . '/../../config.php');
require_once($CFG->libdir . '/adminlib.php');

$id = required_param('id', PARAM_INT);
$course = $DB->get_record('course', array('id' => $id), '*', MUST_EXIST);
$context = context_course::instance($course->id);

require_login($course);
require_capability('moodle/course:update', $context);

$certs = $DB->get_records('certsigner_issued', array('courseid' => $course->id));
if (empty($certs)) {
    print_error('noredirect', 'error', '', 'No hay certificados emitidos para este curso.');
}

$apiurl = get_config('local_certsigner', 'api_base_url') ?: 'https://utcjmicro.javierflores.software';
$apiurl = rtrim($apiurl, '/');

$temp_zip = tempnam(sys_get_temp_dir(), 'utcj_zip_');
$zip = new ZipArchive();
if ($zip->open($temp_zip, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
    print_error('noredirect', 'error', '', 'No se pudo generar el archivo ZIP.');
}

foreach ($certs as $c) {
    $user = $DB->get_record('user', array('id' => $c->userid));
    $user_name = $user ? clean_filename(fullname($user)) : ('Alumno_' . $c->userid);
    
    // Fetch PDF content
    $pdf_url = $apiurl . '/certificate/' . $c->certificateid . '/pdf';
    $ch = curl_init($pdf_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    $pdf_data = curl_exec($ch);
    $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpcode == 200 && !empty($pdf_data)) {
        $filename = "Certificado_UTCJ_{$user_name}_{$c->certificateid}.pdf";
        $zip->addFromString($filename, $pdf_data);
    }
}

$zip->close();

$zip_filename = "Expediente_Certificados_UTCJ_Curso_" . clean_filename($course->shortname) . ".zip";
header('Content-Type: application/zip');
header('Content-Disposition: attachment; filename="' . $zip_filename . '"');
header('Content-Length: ' . filesize($temp_zip));
readfile($temp_zip);
@unlink($temp_zip);
exit;

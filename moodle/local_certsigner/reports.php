<?php
require_once(__DIR__ . '/../../config.php');
require_once($CFG->libdir . '/adminlib.php');

$context = context_system::instance();
require_login();
require_capability('local/certsigner:issue', $context);

$PAGE->set_url('/local/certsigner/reports.php');
$PAGE->set_context($context);
$PAGE->set_title('Dashboard de Métricas — Microcredenciales UTCJ');
$PAGE->set_heading('Dashboard de Métricas de Microcredenciales');

// Filters
$filtercourse = optional_param('courseid', 0, PARAM_INT);
$where = '';
$params = [];
if ($filtercourse) {
    $where = 'WHERE c.courseid = :cid';
    $params['cid'] = $filtercourse;
}

// Fetch statistics from DB - respect status active
$total_issued = $DB->count_records_sql("SELECT COUNT(*) FROM {certsigner_issued} c $where", $params);
$total_courses = $DB->count_records_sql("SELECT COUNT(DISTINCT c.courseid) FROM {certsigner_issued} c $where", $params);
$total_students = $DB->count_records_sql("SELECT COUNT(DISTINCT c.userid) FROM {certsigner_issued} c $where", $params);

// Group by course
$course_stats = $DB->get_records_sql("
    SELECT c.courseid, co.fullname, COUNT(c.id) as count
    FROM {certsigner_issued} c
    JOIN {course} co ON co.id = c.courseid
    $where
    GROUP BY c.courseid, co.fullname
    ORDER BY count DESC
", $params);

$courses = $DB->get_records_sql("SELECT DISTINCT c.courseid, co.fullname FROM {certsigner_issued} c JOIN {course} co ON co.id=c.courseid ORDER BY co.fullname");

echo $OUTPUT->header();
echo '<div class="container-fluid" style="max-width:1100px;">';

echo '<div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">';
echo '<div>';
echo '<h2 class="text-primary fw-bold m-0">Dashboard Analítico de Microcredenciales UTCJ</h2>';
echo '<p class="text-muted small m-0">Métricas de emisión, distribución por curso e impacto académico.</p>';
echo '</div>';
// Course selector instead of hardcoded id=8
echo '<form method="get" class="d-flex gap-2 align-items-center">';
echo '<select name="courseid" class="form-select form-select-sm" onchange="this.form.submit()"><option value="0">Todos los cursos</option>';
foreach ($courses as $co) {
    $sel = $filtercourse == $co->courseid ? 'selected' : '';
    echo '<option value="'.$co->courseid.'" '.$sel.'>'.s($co->fullname).'</option>';
}
echo '</select>';
if ($filtercourse) {
    echo '<a href="'.$CFG->wwwroot.'/local/certsigner/issue.php?id='.$filtercourse.'" class="btn btn-primary btn-sm text-nowrap">Emitir en este curso</a>';
}
echo '</form>';
echo '</div>';

// Metric Cards Grid
echo '<div class="row g-3 mb-4">';
echo '<div class="col-md-4"><div class="card border-start border-4 border-success h-100"><div class="card-body"><div class="text-muted small fw-bold text-uppercase">Total Emitidas</div><div class="h1 text-success fw-bold m-0">' . $total_issued . '</div><div class="text-muted small">Credenciales en Blockchain</div></div></div></div>';
echo '<div class="col-md-4"><div class="card border-start border-4 border-dark h-100"><div class="card-body"><div class="text-muted small fw-bold text-uppercase">Alumnos Certificados</div><div class="h1 fw-bold m-0">' . $total_students . '</div><div class="text-muted small">Estudiantes únicos</div></div></div></div>';
echo '<div class="col-md-4"><div class="card border-start border-4 border-warning h-100"><div class="card-body"><div class="text-muted small fw-bold text-uppercase">Cursos Certificantes</div><div class="h1 text-warning fw-bold m-0">' . $total_courses . '</div><div class="text-muted small">Asignaturas activas</div></div></div></div>';
echo '</div>';

// Course breakdown table
echo '<div class="card"><div class="card-body">';
echo '<div class="d-flex justify-content-between align-items-center mb-3"><h5 class="fw-bold m-0">Distribución por Curso</h5><a href="?courseid='.$filtercourse.'&format=csv" class="btn btn-sm btn-outline-secondary">Exportar CSV</a></div>';

if (optional_param('format', '', PARAM_ALPHA) === 'csv') {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="certsigner_report.csv"');
    $out = fopen('php://output', 'w');
    fputcsv($out, ['Curso', 'Emitidas', 'Porcentaje']);
    foreach ($course_stats as $stat) {
        $percent = $total_issued > 0 ? round(($stat->count / $total_issued) * 100, 1) : 0;
        fputcsv($out, [$stat->fullname, $stat->count, $percent.'%']);
    }
    fclose($out);
    exit;
}

if (empty($course_stats)) {
    echo '<p class="text-muted text-center py-4">Aún no hay registros de emisión.</p>';
} else {
    echo '<div class="table-responsive"><table class="table table-hover m-0">';
    echo '<thead class="table-light"><tr><th class="small text-muted text-uppercase">Curso</th><th class="small text-muted text-uppercase text-center">Emitidas</th><th class="small text-muted text-uppercase">Proporción</th></tr></thead><tbody>';
    foreach ($course_stats as $stat) {
        $percent = $total_issued > 0 ? round(($stat->count / $total_issued) * 100, 1) : 0;
        echo '<tr>';
        echo '<td class="fw-bold">'.s($stat->fullname).'</td>';
        echo '<td class="fw-bold text-success text-center">' . $stat->count . '</td>';
        echo '<td><div class="d-flex align-items-center gap-2"><div class="flex-grow-1 bg-light rounded" style="height:8px"><div class="bg-success h-100 rounded" style="width:' . $percent . '%"></div></div><span class="small fw-bold text-muted" style="width:45px">' . $percent . '%</span></div></td>';
        echo '</tr>';
    }
    echo '</tbody></table></div>';
}
echo '</div></div>';

echo '</div>';
echo $OUTPUT->footer();

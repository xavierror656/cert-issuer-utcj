<?php
require_once(__DIR__ . '/../../config.php');
require_once($CFG->libdir . '/adminlib.php');

$context = context_system::instance();
require_login();
require_capability('moodle/site:config', $context);

$PAGE->set_url('/local/certsigner/reports.php');
$PAGE->set_context($context);
$PAGE->set_title('Dashboard de Métricas — Microcredenciales UTCJ');
$PAGE->set_heading('Dashboard de Métricas de Microcredenciales');

// Fetch statistics from DB
$total_issued = $DB->count_records('certsigner_issued');
$total_courses = $DB->count_records_sql("SELECT COUNT(DISTINCT courseid) FROM {certsigner_issued}");
$total_students = $DB->count_records_sql("SELECT COUNT(DISTINCT userid) FROM {certsigner_issued}");

// Group by course
$course_stats = $DB->get_records_sql("
    SELECT c.courseid, co.fullname, COUNT(c.id) as count
    FROM {certsigner_issued} c
    JOIN {course} co ON co.id = c.courseid
    GROUP BY c.courseid, co.fullname
    ORDER BY count DESC
");

echo $OUTPUT->header();
echo '<div style="max-width:1100px; margin:0 auto; padding:10px;">';

echo '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">';
echo '<div>';
echo '<h2 style="color:#0F6A52; font-weight:bold; margin:0;">📊 Dashboard Analítico de Microcredenciales UTCJ</h2>';
echo '<p style="color:#6c757d; font-size:14px; margin:4px 0 0 0;">Métricas clave de emisión, distribución por curso e impacto académico en Blockchain.</p>';
echo '</div>';
echo '<a href="/local/certsigner/issue.php?id=8" class="btn btn-primary" style="background:#0F6A52; border:none; font-weight:bold;">+ Emitir Credencial</a>';
echo '</div>';

// Metric Cards Grid
echo '<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap:20px; margin-bottom:30px;">';

echo '<div style="background:white; border:1px solid #e2e8f0; border-radius:16px; padding:20px; box-shadow:0 4px 12px rgba(0,0,0,0.04); border-left:5px solid #0F6A52;">';
echo '<span style="color:#64748b; font-size:12px; font-weight:bold; text-transform:uppercase;">Total Emitidas</span>';
echo '<h1 style="color:#0F6A52; font-size:36px; font-weight:900; margin:6px 0 0 0;">' . $total_issued . '</h1>';
echo '<span style="color:#94a3b8; font-size:11px;">Credenciales en Blockchain</span>';
echo '</div>';

echo '<div style="background:white; border:1px solid #e2e8f0; border-radius:16px; padding:20px; box-shadow:0 4px 12px rgba(0,0,0,0.04); border-left:5px solid #0F3E4A;">';
echo '<span style="color:#64748b; font-size:12px; font-weight:bold; text-transform:uppercase;">Alumnos Certificados</span>';
echo '<h1 style="color:#0F3E4A; font-size:36px; font-weight:900; margin:6px 0 0 0;">' . $total_students . '</h1>';
echo '<span style="color:#94a3b8; font-size:11px;">Estudiantes únicos</span>';
echo '</div>';

echo '<div style="background:white; border:1px solid #e2e8f0; border-radius:16px; padding:20px; box-shadow:0 4px 12px rgba(0,0,0,0.04); border-left:5px solid #B88A3B;">';
echo '<span style="color:#64748b; font-size:12px; font-weight:bold; text-transform:uppercase;">Cursos Certificantes</span>';
echo '<h1 style="color:#B88A3B; font-size:36px; font-weight:900; margin:6px 0 0 0;">' . $total_courses . '</h1>';
echo '<span style="color:#94a3b8; font-size:11px;">Asignaturas activas</span>';
echo '</div>';

echo '</div>';

// Course breakdown table
echo '<div style="background:white; border:1px solid #e2e8f0; border-radius:16px; padding:24px; box-shadow:0 4px 12px rgba(0,0,0,0.04);">';
echo '<h3 style="color:#0F3E4A; font-weight:bold; font-size:18px; margin-bottom:16px;">Distribución de Microcredenciales por Curso</h3>';

if (empty($course_stats)) {
    echo '<p style="color:#94a3b8; text-align:center; padding:20px;">Aún no hay registros de emisión acumulados.</p>';
} else {
    echo '<table class="generaltable" style="width:100%; border-collapse:collapse;">';
    echo '<thead><tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0;">
        <th style="padding:12px; font-size:12px; text-transform:uppercase; color:#64748b;">Curso / Asignatura</th>
        <th style="padding:12px; font-size:12px; text-transform:uppercase; color:#64748b; text-align:center;">Emitidas</th>
        <th style="padding:12px; font-size:12px; text-transform:uppercase; color:#64748b;">Proporción</th>
    </tr></thead><tbody>';

    foreach ($course_stats as $stat) {
        $percent = $total_issued > 0 ? round(($stat->count / $total_issued) * 100, 1) : 0;
        echo '<tr style="border-bottom:1px solid #f1f5f9;">';
        echo '<td style="padding:14px; font-weight:bold; color:#1e293b;">' . htmlspecialchars($stat->fullname) . '</td>';
        echo '<td style="padding:14px; font-weight:bold; color:#0F6A52; text-align:center; font-size:16px;">' . $stat->count . '</td>';
        echo '<td style="padding:14px;">
            <div style="display:flex; align-items:center; gap:10px;">
                <div style="flex:1; background:#e2e8f0; height:8px; border-radius:4px; overflow:hidden;">
                    <div style="background:#0F6A52; height:100%; width:' . $percent . '%;"></div>
                </div>
                <span style="font-size:12px; font-weight:bold; color:#64748b; width:45px;">' . $percent . '%</span>
            </div>
        </td>';
        echo '</tr>';
    }
    echo '</tbody></table>';
}
echo '</div>';

echo '</div>';
echo $OUTPUT->footer();

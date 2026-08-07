<?php
defined('MOODLE_INTERNAL') || die();

/**
 * Extend navigation in course menu for Moodle 4.x
 */
function local_certsigner_extend_navigation_course($navigation, $course, $context) {
    if (has_capability('moodle/course:update', $context)) {
        $url = new moodle_url('/local/certsigner/issue.php', array('id' => $course->id));
        $node = navigation_node::create(
            get_string('pluginname', 'local_certsigner'),
            $url,
            navigation_node::TYPE_SETTING,
            null,
            'local_certsigner',
            new pix_icon('i/valid', '')
        );
        $navigation->add_node($node);
    }
}

/**
 * Add "Mis Microcredenciales UTCJ" to user profile page
 */
function local_certsigner_myprofile_navigation(core_user\output\myprofile\tree $tree, $user, $iscurrentuser, $course) {
    if (isloggedin() && !isguestuser() && ($iscurrentuser || has_capability('moodle/user:viewdetails', context_system::instance()))) {
        $url = new moodle_url('/local/certsigner/mycertificates.php');
        $node = new core_user\output\myprofile\node(
            'miscellaneous',
            'local_certsigner_mycerts',
            '🎓 Mis Microcredenciales UTCJ',
            null,
            $url
        );
        $tree->add_node($node);
    }
}

/**
 * Extend user navigation tree
 */
function local_certsigner_extend_navigation_user($navigation, $user, $context) {
    if (isloggedin() && !isguestuser()) {
        $url = new moodle_url('/local/certsigner/mycertificates.php');
        $navigation->add(
            '🎓 Mis Microcredenciales UTCJ',
            $url,
            navigation_node::TYPE_SETTING,
            null,
            'my_certsigner_certs'
        );
    }
}

/**
 * Display Course Banner in Moodle
 */
function local_certsigner_before_standard_top_of_body_html() {
    global $PAGE, $COURSE;
    if ($COURSE && $COURSE->id > 1 && $PAGE->pagelayout === 'incourse') {
        echo '<div style="background:linear-gradient(135deg, #0F6A52, #0F3E4A); color:white; padding:12px 20px; border-radius:12px; margin:12px 0 20px 0; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; box-shadow:0 4px 14px rgba(15,106,82,0.18); font-family:sans-serif;">
            <div style="display:flex; align-items:center; gap:12px;">
                <span style="font-size:22px;">🎓</span>
                <div>
                    <strong style="font-size:13px; font-weight:700; letter-spacing:0.3px;">Este curso otorga Microcredencial Verificable UTCJ</strong>
                    <p style="font-size:11px; margin:2px 0 0 0; opacity:0.9;">Acreditación oficial respaldada e infalsificable anclada en la Blockchain de Ethereum.</p>
                </div>
            </div>
            <a href="/local/certsigner/mycertificates.php" style="background:#B88A3B; color:white; text-decoration:none; padding:7px 16px; border-radius:8px; font-weight:bold; font-size:12px; box-shadow:0 2px 8px rgba(184,138,59,0.3);">Mis Credenciales →</a>
        </div>';
    }
}

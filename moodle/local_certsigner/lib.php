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

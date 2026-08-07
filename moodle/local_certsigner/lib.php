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

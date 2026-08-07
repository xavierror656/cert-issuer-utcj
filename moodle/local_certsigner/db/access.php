<?php
defined('MOODLE_INTERNAL') || die();

$capabilities = array(
    'local/certsigner:issue' => array(
        'captype' => 'write',
        'contextlevel' => CONTEXT_COURSE,
        'archetypes' => array(
            'editingteacher' => CAP_ALLOW,
            'manager' => CAP_ALLOW
        )
    ),
);

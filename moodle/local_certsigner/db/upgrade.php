<?php
defined('MOODLE_INTERNAL') || die();

function xmldb_local_certsigner_upgrade($oldversion) {
    global $DB;
    $dbman = $DB->get_manager();

    if ($oldversion < 2026080703) {
        $table = new xmldb_table('certsigner_issued');
        $table->add_field('id', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, XMLDB_SEQUENCE, null);
        $table->add_field('courseid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, null);
        $table->add_field('userid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, null);
        $table->add_field('certificateid', XMLDB_TYPE_CHAR, '64', null, XMLDB_NOTNULL, null, null);
        $table->add_field('certificateurl', XMLDB_TYPE_TEXT, null, null, null, null, null);
        $table->add_field('pdfurl', XMLDB_TYPE_TEXT, null, null, null, null, null);
        $table->add_field('timeissued', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, '0');

        $table->add_key('primary', XMLDB_KEY_PRIMARY, array('id'));

        if (!$dbman->table_exists($table)) {
            $dbman->create_table($table);
        }

        upgrade_plugin_savepoint(true, 2026080703, 'local', 'certsigner');
    }

    return true;
}

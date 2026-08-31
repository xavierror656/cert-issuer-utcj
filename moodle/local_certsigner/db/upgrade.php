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

    if ($oldversion < 2026080712) {
        $table = new xmldb_table('certsigner_issued');

        // Add status field.
        $field = new xmldb_field('status', XMLDB_TYPE_CHAR, '20', null, XMLDB_NOTNULL, null, 'active', 'timeissued');
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }
        $field = new xmldb_field('timerevoked', XMLDB_TYPE_INTEGER, '10', null, null, null, null, 'status');
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }
        // Add indexes.
        $index = new xmldb_index('courseid', XMLDB_INDEX_NOTUNIQUE, array('courseid'));
        if (!$dbman->index_exists($table, $index)) {
            $dbman->add_index($table, $index);
        }
        $index = new xmldb_index('userid', XMLDB_INDEX_NOTUNIQUE, array('userid'));
        if (!$dbman->index_exists($table, $index)) {
            $dbman->add_index($table, $index);
        }
        $index = new xmldb_index('status', XMLDB_INDEX_NOTUNIQUE, array('status'));
        if (!$dbman->index_exists($table, $index)) {
            $dbman->add_index($table, $index);
        }
        // Unique on certificateid.
        $key = new xmldb_key('certificateid', XMLDB_KEY_UNIQUE, array('certificateid'));
        // Only add if not exists (check via index).
        try {
            $dbman->add_key($table, $key);
        } catch (Exception $e) {
            // Ignore if already exists.
        }

        upgrade_plugin_savepoint(true, 2026080712, 'local', 'certsigner');
    }

    return true;
}

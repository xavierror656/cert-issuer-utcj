<?php
defined('MOODLE_INTERNAL') || die();

/**
 * Helper: get API config once
 */
function certsigner_get_api_config() {
    $url = get_config('local_certsigner', 'api_base_url');
    if (empty($url)) {
        $url = 'https://utcjmicro.javierflores.software';
    }
    $key = get_config('local_certsigner', 'api_key');
    return [rtrim($url, '/'), $key];
}

/**
 * Helper: single curl wrapper (DRY for issue.php 4x duplication)
 * @return array [httpcode, body, decoded]
 */
function certsigner_api_call($path, $payload = null, $method = 'POST', $timeout = 30) {
    list($apiurl, $apikey) = certsigner_get_api_config();
    if (empty($apikey)) {
        return [0, '', null, 'API Key no configurada. Ve a Administración > Plugins > CertSigner.'];
    }
    $ch = curl_init($apiurl . $path);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    $headers = ['Content-Type: application/json', 'X-API-Key: ' . $apikey];
    if ($payload !== null) {
        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
        } else {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        }
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    } else if ($method !== 'GET') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, '{}');
        }
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($resp === false && $err) {
        return [$code, $err, null, $err];
    }
    $decoded = json_decode($resp, true);
    $detail = null;
    if ($decoded && isset($decoded['detail'])) {
        $detail = $decoded['detail'];
    }
    return [$code, $resp, $decoded, $detail];
}

/**
 * Extend navigation in course menu for Moodle 4.x
 */
function local_certsigner_extend_navigation_course($navigation, $course, $context) {
    if (has_capability('local/certsigner:issue', $context)) {
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
            'Mis Microcredenciales UTCJ',
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
            'Mis Microcredenciales UTCJ',
            $url,
            navigation_node::TYPE_SETTING,
            null,
            'my_certsigner_certs'
        );
    }
}

/**
 * Ponytail: emite badge vanilla de Moodle + blockchain en 1 paso.
 * Reusa tablas mdl_badge / mdl_badge_issued, aparece en badges/mybadges.php sin UI nueva.
 */
function certsigner_issue_moodle_badge($courseid, $userid, $certificateid, $coursename) {
    global $DB, $USER;
    if (! $DB->get_manager()->table_exists('badge')) {
        return; // badges deshabilitados
    }
    try {
        // 1. Busca badge template por curso.
        $badge = $DB->get_record('badge', ['courseid' => $courseid, 'name' => $coursename . ' - Microcredencial UTCJ']);
        if (!$badge) {
            $now = time();
            $badge = (object)[
                'name' => $coursename . ' - Microcredencial UTCJ',
                'description' => 'Microcredencial verificable UTCJ anclada en Blockchain Ethereum. ID: ' . $certificateid,
                'timecreated' => $now,
                'timemodified' => $now,
                'usercreated' => $USER->id ?? 2,
                'usermodified' => $USER->id ?? 2,
                'issuername' => get_config('local_certsigner', 'issuer_name_default') ?: 'Universidad Tecnologica de Ciudad Juarez',
                'issuerurl' => get_config('local_certsigner', 'issuer_id_default') ?: 'https://www.utcj.edu.mx',
                'issuercontact' => 'microcredenciales@utcj.edu.mx',
                'expiredate' => null,
                'expireperiod' => null,
                'type' => 1, // BADGE_TYPE_COURSE
                'courseid' => $courseid,
                'message' => 'Has obtenido la microcredencial verificable: ' . $coursename . '. Verifícala en https://utcjmicro.javierflores.software/render/' . $certificateid,
                'messagesubject' => 'Microcredencial UTCJ: ' . $coursename,
                'attachment' => 1,
                'notification' => 0,
                'status' => 1, // BADGE_STATUS_ACTIVE
                'nextcron' => null,
                'version' => '',
                'language' => 'es',
                'imageauthorname' => 'UTCJ',
                'imageauthoremail' => 'microcredenciales@utcj.edu.mx',
                'imageauthorurl' => 'https://www.utcj.edu.mx',
                'imagecaption' => $coursename,
            ];
            $badge->id = $DB->insert_record('badge', $badge);
            // Criterio manual (awarded by plugin).
            $DB->insert_record('badge_criteria', (object)[
                'badgeid' => $badge->id,
                'criteriatype' => 1, // overall
                'method' => 1,
            ]);
            // Inserta criterio manual vacío para que badge sea otorgable.
            $DB->insert_record('badge_criteria_param', (object)[
                'critid' => $DB->get_field('badge_criteria', 'id', ['badgeid' => $badge->id]),
                'name' => 'manual',
                'value' => '1',
            ]);
        }
        // 2. Evita duplicado.
        if ($DB->record_exists('badge_issued', ['badgeid' => $badge->id, 'userid' => $userid])) {
            return;
        }
        // 3. Emite badge vanilla.
        $hash = hash('sha256', $certificateid . '|' . $userid . '|' . $badge->id);
        $DB->insert_record('badge_issued', (object)[
            'badgeid' => $badge->id,
            'userid' => $userid,
            'uniquehash' => $hash,
            'dateissued' => time(),
            'dateexpire' => null,
            'visible' => 1,
            'issuernotified' => null,
        ]);
    } catch (Exception $e) {
        debugging('certsigner badge emit failed: ' . $e->getMessage(), DEBUG_DEVELOPER);
    }
}

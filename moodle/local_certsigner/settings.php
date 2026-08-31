<?php
defined('MOODLE_INTERNAL') || die();

if ($hassiteconfig) {
    $settings = new admin_settingpage('local_certsigner', get_string('pluginname', 'local_certsigner'));

    $settings->add(new admin_setting_configtext(
        'local_certsigner/api_base_url',
        get_string('api_base_url', 'local_certsigner'),
        get_string('api_base_url_desc', 'local_certsigner'),
        'https://utcjmicro.javierflores.software',
        PARAM_URL
    ));

    $settings->add(new admin_setting_configselect(
        'local_certsigner/auth_mode',
        get_string('auth_mode', 'local_certsigner'),
        get_string('auth_mode_desc', 'local_certsigner'),
        'X-API-Key',
        array('X-API-Key' => 'X-API-Key', 'Bearer Token' => 'Bearer Token')
    ));

    $settings->add(new admin_setting_configpasswordunmask(
        'local_certsigner/api_key',
        get_string('api_key', 'local_certsigner'),
        get_string('api_key_desc', 'local_certsigner') . ' <b>Deja vacío para deshabilitar emisión.</b>',
        ''
    ));

    $settings->add(new admin_setting_configselect(
        'local_certsigner/chain_default',
        get_string('chain_default', 'local_certsigner'),
        'Testnet (Sepolia) es gratis, Mainnet cuesta ~$1/tx. Cambia a ethereum_sepolia para probar sin fondear.',
        'ethereum_sepolia',
        array(
            'ethereum_sepolia' => 'ethereum_sepolia (Testnet Sepolia - GRATIS)',
            'ethereum_mainnet' => 'ethereum_mainnet (Mainnet - $1/tx, requiere fondeo)',
            'mockchain' => 'mockchain (Demo sin blockchain)',
        )
    ));

    $settings->add(new admin_setting_configtext(
        'local_certsigner/issuer_name_default',
        get_string('issuer_name_default', 'local_certsigner'),
        '',
        'Universidad Tecnologica de Ciudad Juarez',
        PARAM_TEXT
    ));

    $settings->add(new admin_setting_configtext(
        'local_certsigner/issuer_id_default',
        get_string('issuer_id_default', 'local_certsigner'),
        '',
        'https://www.utcj.edu.mx',
        PARAM_TEXT
    ));

    $ADMIN->add('localplugins', $settings);
}

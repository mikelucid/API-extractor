<?php

declare(strict_types=1);

return [
    'data_dir' => getenv('ROOTV2_DATA_DIR') ?: dirname(__DIR__).'/storage/app/rootv2',
    'identity_key' => getenv('ROOTV2_IDENTITY_KEY') ?: 'dev-only-passphrase',
    'constitution_version' => '1.0.0',
    'cognitive_fabric' => [
        'cores' => 128,
        'rows' => 8,
        'cols' => 16,
        'ports' => 7,
        'hub_core' => 0,
    ],
    'amorphous' => [
        'markup' => 1.25,
        'floor_usd' => 29.0,
        'min_margin' => 0.15,
        'free_ttl_hours' => 4,
        'synthesizer' => getenv('AMORPHOUS_SYNTHESIZER') ?: 'mock',
    ],
    'decision' => [
        'contain_threshold' => 1.5,
        'escalate_threshold' => 1.0,
        'hysteresis' => 0.15,
    ],
    'escalation' => [
        'auto_response_ratio' => 80,
        'escalation_threshold' => 0.92,
    ],
    'decentral' => [
        'torrent' => false,
        'dht' => false,
        'peer_recognition' => false,
        'advertising' => false,
        'allowlisted_local_peers_only' => true,
    ],
];

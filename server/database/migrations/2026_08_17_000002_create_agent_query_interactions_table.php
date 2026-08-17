<?php

declare(strict_types=1);

return [
    'table' => 'agent_query_interactions',
    'columns' => [
        'id' => 'bigint',
        'uuid' => 'uuid',
        'domain' => 'string',
        'topic' => 'string',
        'request' => 'text',
        'best_answer' => 'text',
        'api_used' => 'string',
        'rating' => 'float',
        'created_at' => 'timestamp',
    ],
    'forbidden' => ['torrent', 'dht', 'peer_advertising'],
];

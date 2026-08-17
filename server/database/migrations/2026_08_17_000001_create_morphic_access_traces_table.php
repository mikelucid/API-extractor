<?php

declare(strict_types=1);

/**
 * Schema sketch for Morphic Memory access traces.
 * Apply with a full Laravel migrate when illuminate/database is present.
 */
return [
    'table' => 'morphic_access_traces',
    'columns' => [
        'id' => 'bigint',
        'memory_key' => 'string',
        'op' => 'string', // read|write
        'latency_ms' => 'float',
        'layout' => 'string',
        'created_at' => 'timestamp',
    ],
];

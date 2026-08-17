<?php

declare(strict_types=1);

return [
    'name' => getenv('APP_NAME') ?: 'Rootv2Server',
    'env' => getenv('APP_ENV') ?: 'local',
    'debug' => filter_var(getenv('APP_DEBUG') ?: 'true', FILTER_VALIDATE_BOOL),
];

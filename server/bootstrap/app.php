<?php

declare(strict_types=1);

use App\Providers\Rootv2ServiceProvider;

/**
 * Laravel 11-shaped bootstrap. Domain classes do not require illuminate/foundation;
 * this file documents how they bind when dropped into a full Laravel app.
 */
return [
    'providers' => [
        Rootv2ServiceProvider::class,
    ],
];

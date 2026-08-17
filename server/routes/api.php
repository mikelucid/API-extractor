<?php

declare(strict_types=1);

use App\Http\Controllers\MapController;
use App\Http\Controllers\StatusController;

/**
 * Lightweight route table used by public/index.php.
 * In a full Laravel app these become Route::get(...) entries.
 */
return [
    '/up' => static fn () => ['status' => 'ok'],
    '/api/status' => static fn () => (new StatusController())->show(),
    '/api/map' => static fn () => (new MapController())->show(),
];

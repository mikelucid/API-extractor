<?php

declare(strict_types=1);

use App\Http\Controllers\AmorphousController;
use App\Http\Controllers\DecideController;
use App\Http\Controllers\IdentityController;
use App\Http\Controllers\MapController;
use App\Http\Controllers\MemoryController;
use App\Http\Controllers\ObserveController;
use App\Http\Controllers\StatusController;
use App\Supervisor\Kernel;

/**
 * Laravel-shaped HTTP table. public/index.php dispatches method+path.
 *
 * @return array<string, callable(array): array>
 */
return [
    'GET /up' => static fn () => ['status' => 'ok'],
    'GET /api/status' => static fn () => Kernel::boot()->status(),
    'GET /api/map' => static fn () => (new MapController())->show(),
    'POST /api/decide' => static fn (array $in) => (new DecideController())->store($in),
    'POST /api/observe' => static fn (array $in) => (new ObserveController())->store($in),
    'POST /api/memory' => static fn (array $in) => (new MemoryController())->store($in),
    'GET /api/memory' => static fn (array $in) => (new MemoryController())->index((string) ($in['q'] ?? '')),
    'POST /api/amorphous/quote' => static fn (array $in) => (new AmorphousController())->quote($in),
    'POST /api/amorphous/spin' => static fn (array $in) => (new AmorphousController())->spin($in),
    'POST /api/identity/enroll' => static fn (array $in) => (new IdentityController())->enroll($in),
    'POST /api/identity/resolve' => static fn (array $in) => (new IdentityController())->resolve($in),
    'GET /api/legacy-status' => static fn () => (new StatusController())->show(),
];

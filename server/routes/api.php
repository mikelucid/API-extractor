<?php

declare(strict_types=1);

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AmorphousController;
use App\Http\Controllers\DecideController;
use App\Http\Controllers\GwavController;
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
    'GET /api/amorphous/environments' => static fn () => (new AmorphousController())->environments(),
    'GET /api/amorphous/providers' => static fn () => (new AmorphousController())->providers(),
    'GET /api/admin/overview' => static fn (array $in) => (new AdminController())->overview($in),
    'POST /api/admin/cloud/connect' => static fn (array $in) => (new AdminController())->connectCloud($in),
    'POST /api/admin/cloud/disconnect' => static fn (array $in) => (new AdminController())->disconnectCloud($in),
    'POST /api/admin/environment/freeze' => static fn (array $in) => (new AdminController())->freezeEnvironment($in),
    'POST /api/admin/environment/hibernate' => static fn (array $in) => (new AdminController())->hibernateEnvironment($in),
    'POST /api/admin/environment/destroy' => static fn (array $in) => (new AdminController())->destroyEnvironment($in),
    'POST /api/admin/pricing/preview' => static fn (array $in) => (new AdminController())->updatePricing($in),
    'POST /api/identity/enroll' => static fn (array $in) => (new IdentityController())->enroll($in),
    'POST /api/identity/resolve' => static fn (array $in) => (new IdentityController())->resolve($in),
    'GET /api/gwav' => static fn () => (new GwavController())->index(),
    'POST /api/gwav/seed' => static fn () => (new GwavController())->seed(),
    'POST /api/gwav/prompt' => static fn (array $in) => (new GwavController())->prompt($in),
    'POST /api/gwav/orbit' => static fn (array $in) => (new GwavController())->orbit($in),
    'POST /api/gwav/export-ollama' => static fn (array $in) => (new GwavController())->exportOllama($in),
    'GET /api/legacy-status' => static fn () => (new StatusController())->show(),
];

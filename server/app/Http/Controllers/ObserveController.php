<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Supervisor\Kernel;

final class ObserveController
{
    public function store(array $input): array
    {
        $kernel = Kernel::boot();

        return $kernel->observe(
            (array) ($input['hits'] ?? []),
            (string) ($input['sessionId'] ?? 'session'),
            (array) ($input['candidate'] ?? []),
        );
    }
}

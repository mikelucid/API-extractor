<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Supervisor\Kernel;

final class MemoryController
{
    public function store(array $input): array
    {
        $kernel = Kernel::boot();

        return $kernel->memory->ingest([
            'kind' => (string) ($input['kind'] ?? 'info'),
            'outcome' => (string) ($input['outcome'] ?? 'info'),
            'detail' => (string) ($input['detail'] ?? ''),
        ]);
    }

    public function index(string $query): array
    {
        $kernel = Kernel::boot();

        return ['records' => $kernel->memory->recall($query)];
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Supervisor\Kernel;

final class DecideController
{
    public function store(array $input): array
    {
        $kernel = Kernel::boot();

        return $kernel->decide((string) ($input['text'] ?? ''));
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Supervisor\Kernel;

final class IdentityController
{
    public function enroll(array $input): array
    {
        $kernel = Kernel::boot();
        $kernel->identity->enroll((string) $input['id'], (array) ($input['fields'] ?? []));

        return ['ok' => true];
    }

    public function resolve(array $input): array
    {
        $kernel = Kernel::boot();

        return $kernel->identity->resolve((string) $input['requesterId'], (string) $input['subjectId']);
    }
}

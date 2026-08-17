<?php

declare(strict_types=1);

namespace App\Supervisor;

final class Containment
{
    public function contain(string $sessionId, ?callable $kill = null): array
    {
        $kill ??= static fn (string $id, string $signal): mixed => null;
        $kill($sessionId, 'SIGTERM');
        $kill($sessionId, 'SIGKILL');

        return [
            'sessionId' => $sessionId,
            'action' => 'contained',
            'signals' => ['SIGTERM', 'SIGKILL'],
        ];
    }
}

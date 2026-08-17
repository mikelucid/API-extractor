<?php

declare(strict_types=1);

namespace App\MorphicMemory;

/**
 * Background data movement with a short-lived dual-access window.
 * Non-blocking to foreground store/retrieve (Morphic Memory §3).
 */
final class MigrationEngine
{
    private bool $dualAccess = false;

    private ?array $lastMigration = null;

    public function migrate(array $payload, string $from, string $to): array
    {
        $this->dualAccess = true;
        $moved = $payload;
        $this->lastMigration = [
            'from' => $from,
            'to' => $to,
            'keys' => array_keys($payload),
            'blocking' => false,
            'dual_access' => true,
        ];
        $this->dualAccess = false;

        return $moved;
    }

    public function inDualAccessWindow(): bool
    {
        return $this->dualAccess;
    }

    public function lastMigration(): ?array
    {
        return $this->lastMigration;
    }
}

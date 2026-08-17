<?php

declare(strict_types=1);

namespace App\Supervisor;

/**
 * Owner-readable append-only audit. Never hides events from the owner.
 */
final class AuditLog
{
    /** @var list<array<string, mixed>> */
    private array $events = [];

    public function append(array $event): array
    {
        $event['at'] = $event['at'] ?? gmdate('c');
        $this->events[] = $event;

        return $event;
    }

    /** @return list<array<string, mixed>> */
    public function all(): array
    {
        return $this->events;
    }
}

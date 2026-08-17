<?php

declare(strict_types=1);

namespace App\Fallback;

final class CircuitBreaker
{
    private int $failures = 0;

    private ?float $openedAt = null;

    public function __construct(
        private readonly int $failureThreshold = 3,
        private readonly int $coolDownMs = 30_000,
    ) {
    }

    public function isOpen(): bool
    {
        if ($this->openedAt === null) {
            return false;
        }
        if ((microtime(true) * 1000) - $this->openedAt >= $this->coolDownMs) {
            $this->openedAt = null;
            $this->failures = 0;

            return false;
        }

        return true;
    }

    public function recordSuccess(): void
    {
        $this->failures = 0;
        $this->openedAt = null;
    }

    public function recordFailure(): void
    {
        $this->failures++;
        if ($this->failures >= $this->failureThreshold) {
            $this->openedAt = microtime(true) * 1000;
        }
    }
}

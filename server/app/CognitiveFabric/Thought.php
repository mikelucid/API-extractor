<?php

declare(strict_types=1);

namespace App\CognitiveFabric;

/**
 * Priority-buoyant thought exchanged across fabric ports.
 */
final class Thought
{
    public function __construct(
        public readonly string $id,
        public readonly string $payload,
        public float $priority,
        public readonly int $originCore,
        public int $hops = 0,
    ) {
    }

    public function decay(): void
    {
        $this->priority *= 0.99;
        $this->hops++;
    }
}

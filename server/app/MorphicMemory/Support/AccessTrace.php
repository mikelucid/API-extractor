<?php

declare(strict_types=1);

namespace App\MorphicMemory\Support;

final class AccessTrace
{
    public function __construct(
        public readonly string $key,
        public readonly string $op,
        public readonly float $at,
        public readonly float $latencyMs = 0.0,
    ) {
    }
}

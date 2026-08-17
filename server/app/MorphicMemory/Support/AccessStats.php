<?php

declare(strict_types=1);

namespace App\MorphicMemory\Support;

final class AccessStats
{
    public function __construct(
        public readonly float $locality,
        public readonly float $burstiness,
        public readonly float $readWriteAsymmetry,
        public readonly float $reorgBudget,
        public readonly int $touches,
        public readonly array $hotKeys,
    ) {
    }
}

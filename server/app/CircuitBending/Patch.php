<?php

declare(strict_types=1);

namespace App\CircuitBending;

final class Patch
{
    /**
     * @param array<string, float> $values
     * @param list<array{from:string,to:string}> $extraWires
     */
    public function __construct(
        public readonly string $name,
        public readonly array $values,
        public readonly array $extraWires = [],
    ) {
    }
}

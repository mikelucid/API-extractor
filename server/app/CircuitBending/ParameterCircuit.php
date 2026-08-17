<?php

declare(strict_types=1);

namespace App\CircuitBending;

/**
 * Parameter-level circuit: knobs the owner already exposes, plus optional internal
 * nodes they declared in source. Never inferred from a third-party binary.
 */
final class ParameterCircuit
{
    /** @param array<string, float> $values */
    public function __construct(
        public readonly CircuitGraph $graph,
        public array $values,
    ) {
    }

    public function set(string $nodeId, float $value): void
    {
        $this->values[$nodeId] = max(0.0, min(1.0, $value));
    }
}

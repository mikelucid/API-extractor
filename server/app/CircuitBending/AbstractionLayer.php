<?php

declare(strict_types=1);

namespace App\CircuitBending;

/**
 * Patchable abstraction over a declared graph — not a reconstruction of compiled DSP.
 */
final class AbstractionLayer
{
    public function wrap(ParameterCircuit $circuit): array
    {
        return [
            'patchable' => true,
            'source' => 'owner_declared',
            'nodes' => array_map(static fn ($n) => $n['id'], $circuit->graph->nodes),
            'values' => $circuit->values,
        ];
    }
}

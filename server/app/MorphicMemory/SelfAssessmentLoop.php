<?php

declare(strict_types=1);

namespace App\MorphicMemory;

/**
 * Periodically audits whether a layout change improved latency / energy-per-access.
 * Reverts or adjusts if not (Morphic Memory §3).
 */
final class SelfAssessmentLoop
{
    public function assess(array $before, array $after): array
    {
        $latencyDelta = ($before['avg_latency'] ?? 0) - ($after['avg_latency'] ?? 0);
        $energyDelta = ($before['energy_per_access'] ?? 0) - ($after['energy_per_access'] ?? 0);
        $improved = $latencyDelta >= -0.01 && $energyDelta >= -0.01 && ($latencyDelta + $energyDelta) > 0;

        return [
            'keep' => $improved,
            'revert' => ! $improved,
            'latency_delta' => $latencyDelta,
            'energy_delta' => $energyDelta,
            'reason' => $improved ? 'Metrics improved — keep layout.' : 'No improvement — revert layout.',
        ];
    }
}

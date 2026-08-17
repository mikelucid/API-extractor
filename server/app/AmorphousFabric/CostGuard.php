<?php

declare(strict_types=1);

namespace App\AmorphousFabric;

/**
 * Cost allocation tags + anomaly freeze so runaway architectures cannot bill.
 */
final class CostGuard
{
    public function inspect(float $awsCostUsd, float $expectedUsd, float $spikeFactor = 3.0): array
    {
        $runaway = $expectedUsd > 0 && $awsCostUsd > $expectedUsd * $spikeFactor;

        return [
            'frozen' => $runaway,
            'reason' => $runaway
                ? 'Cost anomaly — architecture frozen before it bills.'
                : 'Within expected envelope.',
            'aws_cost' => $awsCostUsd,
            'expected' => $expectedUsd,
        ];
    }
}

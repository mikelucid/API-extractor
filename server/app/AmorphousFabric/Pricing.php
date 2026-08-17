<?php

declare(strict_types=1);

namespace App\AmorphousFabric;

/**
 * Monthly bill = AWS cost × 1.25, floor $29, never below 15% margin.
 */
final class Pricing
{
    public function __construct(
        private readonly float $markup = 1.25,
        private readonly float $floorUsd = 29.0,
        private readonly float $minMargin = 0.15,
    ) {
    }

    public function quote(float $awsCostUsd): array
    {
        $spread = $awsCostUsd * $this->markup;
        $bill = max($this->floorUsd, $spread);
        $margin = $awsCostUsd <= 0.0 ? 1.0 : ($bill - $awsCostUsd) / $bill;
        if ($margin < $this->minMargin && $awsCostUsd > 0.0) {
            $bill = $awsCostUsd / (1.0 - $this->minMargin);
            $margin = ($bill - $awsCostUsd) / $bill;
        }

        return [
            'aws_cost' => $awsCostUsd,
            'bill' => round($bill, 2),
            'margin' => $margin,
            'floor_applied' => $spread < $this->floorUsd,
            'line_item' => 'Your server fabric cost',
        ];
    }
}

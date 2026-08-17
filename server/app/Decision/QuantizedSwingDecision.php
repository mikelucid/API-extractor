<?php

declare(strict_types=1);

namespace App\Decision;

/**
 * Quantize threat/safe ratio into HOLD / ESCALATE / CONTAIN with hysteresis
 * so contain/release does not flutter near the threshold (Live Rating PDF).
 */
final class QuantizedSwingDecision
{
    private int $lastQuant = 0;

    public function __construct(
        private readonly float $hysteresis = 0.15,
        private readonly float $containEnter = 1.5,
        private readonly float $escalateEnter = 1.0,
    ) {
    }

    public function decide(float $ratio): array
    {
        $quant = $this->quantizeRatio($ratio);
        $this->lastQuant = $quant;

        return match ($quant) {
            2 => ['quant' => 2, 'action' => 'contain', 'label' => 'CONTAIN'],
            1 => ['quant' => 1, 'action' => 'escalate', 'label' => 'ESCALATE'],
            default => ['quant' => 0, 'action' => 'hold', 'label' => 'HOLD'],
        };
    }

    public function reset(): void
    {
        $this->lastQuant = 0;
    }

    private function quantizeRatio(float $ratio): int
    {
        if ($this->lastQuant === 0) {
            if ($ratio >= $this->containEnter + $this->hysteresis) {
                return 2;
            }
            if ($ratio >= $this->escalateEnter + $this->hysteresis) {
                return 1;
            }

            return 0;
        }
        if ($this->lastQuant === 2) {
            if ($ratio < $this->containEnter - $this->hysteresis) {
                return $ratio >= $this->escalateEnter ? 1 : 0;
            }

            return 2;
        }
        if ($ratio >= $this->containEnter + $this->hysteresis) {
            return 2;
        }
        if ($ratio < $this->escalateEnter - $this->hysteresis) {
            return 0;
        }

        return 1;
    }
}

<?php

declare(strict_types=1);

namespace App\Decision;

/**
 * Convert a stream of live signals into P_threat / (P_safe + ε).
 * Adapted from decision_from_ratio in the Live Rating extract.
 */
final class RatioEngine
{
    /** @var list<array{kind:string,intensity:float,at:string}> */
    private array $signals = [];

    public function __construct(
        private readonly float $containThreshold = 1.5,
        private readonly float $escalateThreshold = 1.0,
        private readonly float $epsilon = 1e-6,
        private readonly int $windowSize = 32,
    ) {
    }

    public function addSignal(string $kind, float $intensity): void
    {
        $this->signals[] = [
            'kind' => $kind,
            'intensity' => max(0.0, min(1.0, $intensity)),
            'at' => gmdate('c'),
        ];
        if (count($this->signals) > $this->windowSize) {
            $this->signals = array_slice($this->signals, -$this->windowSize);
        }
    }

    public function clear(): void
    {
        $this->signals = [];
    }

    public function evaluate(): array
    {
        $threat = 0.0;
        $safe = 0.0;
        foreach ($this->signals as $signal) {
            if (in_array($signal['kind'], Types::THREAT_KINDS, true)) {
                $threat += $signal['intensity'];
            } else {
                $safe += $signal['intensity'];
            }
        }
        if ($this->signals === []) {
            $safe = 1.0;
        }
        $ratio = $threat / ($safe + $this->epsilon);
        $action = self::decisionFromRatio($ratio, $this->containThreshold, $this->escalateThreshold);
        $confidence = max(0.0, min(1.0, abs($ratio - 1.0) / ($this->containThreshold + 1.0)));

        return [
            'threatMass' => $threat,
            'safeMass' => $safe,
            'threatSafeRatio' => $ratio,
            'action' => $action,
            'confidence' => $confidence,
        ];
    }

    public static function decisionFromRatio(float $ratio, float $contain = 1.5, float $escalate = 1.0): string
    {
        if ($ratio >= $contain) {
            return 'contain';
        }
        if ($ratio >= $escalate) {
            return 'escalate';
        }

        return 'hold';
    }
}

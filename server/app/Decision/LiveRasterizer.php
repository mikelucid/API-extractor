<?php

declare(strict_types=1);

namespace App\Decision;

/**
 * Telemetry raster: bins detector hits, maintains a decaying density grid,
 * and emits a threat/safe ratio for QuantizedSwingDecision.
 */
final class LiveRasterizer
{
    /** @var array<string, float> */
    private array $bins = [
        'disallowed_host' => 0.0,
        'runaway_spawn' => 0.0,
        'constitution_breach' => 0.0,
        'sandbox_escape' => 0.0,
        'safe_heartbeat' => 0.0,
    ];

    public function __construct(public readonly RatioEngine $engine = new RatioEngine())
    {
    }

    public function tick(float $decay = 0.85): void
    {
        foreach ($this->bins as $kind => $value) {
            $this->bins[$kind] = $value * $decay;
        }
    }

    /** @param list<array{kind:string,confidence?:float}> $hits */
    public function ingestHits(array $hits): void
    {
        $this->tick();
        if ($hits === []) {
            $this->addSignal('safe_heartbeat', 0.4);

            return;
        }
        foreach ($hits as $hit) {
            $this->addSignal($hit['kind'], $hit['confidence'] ?? 1.0);
        }
    }

    public function addSignal(string $kind, float $intensity): void
    {
        if (! array_key_exists($kind, $this->bins)) {
            $kind = 'safe_heartbeat';
        }
        $this->bins[$kind] = min(1.0, $this->bins[$kind] + $intensity);
        $this->engine->addSignal($kind, $intensity);
    }

    public function snapshot(): array
    {
        return $this->engine->evaluate();
    }

    /** @return array<string, float> */
    public function binState(): array
    {
        return $this->bins;
    }
}

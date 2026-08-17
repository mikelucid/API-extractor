<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Decision\LiveRasterizer;
use App\Decision\QuantizedSwingDecision;
use App\Decision\RatioEngine;
use Tests\TestCase;

final class DecisionTest extends TestCase
{
    public function test_ratio_crosses_contain_threshold(): void
    {
        $engine = new RatioEngine();
        $engine->addSignal('disallowed_host', 1.0);
        $engine->addSignal('runaway_spawn', 1.0);
        $engine->addSignal('safe_heartbeat', 0.2);
        $snap = $engine->evaluate();
        $this->assertSame('contain', $snap['action']);
        $this->assertGreaterThanOrEqual(1.5, $snap['threatSafeRatio']);
    }

    public function test_empty_window_holds(): void
    {
        $this->assertSame('hold', (new RatioEngine())->evaluate()['action']);
    }

    public function test_hysteresis_avoids_flutter_around_one(): void
    {
        $swing = new QuantizedSwingDecision(0.15);
        $this->assertSame('hold', $swing->decide(1.05)['action']);
        $this->assertSame('escalate', $swing->decide(1.20)['action']);
        $this->assertSame('escalate', $swing->decide(1.05)['action']);
        $this->assertSame('hold', $swing->decide(0.80)['action']);
    }

    public function test_live_rasterizer_ingests_hits(): void
    {
        $raster = new LiveRasterizer();
        $raster->ingestHits([['kind' => 'constitution_breach', 'confidence' => 0.9]]);
        $snap = $raster->snapshot();
        $this->assertGreaterThan(0.0, $snap['threatMass']);
        $this->assertArrayHasKey('constitution_breach', $raster->binState());
    }
}

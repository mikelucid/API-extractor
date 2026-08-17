<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\AmorphousFabric\AwsSynthesizer;
use App\AmorphousFabric\CostGuard;
use App\AmorphousFabric\DeclarativeSpec;
use App\AmorphousFabric\Pricing;
use App\AmorphousFabric\SpinUp;
use Tests\TestCase;

final class AmorphousFabricTest extends TestCase
{
    public function test_pricing_applies_markup_and_floor(): void
    {
        $pricing = new Pricing();
        $low = $pricing->quote(0);
        $this->assertSame(29.0, $low['bill']);
        $this->assertTrue($low['floor_applied']);
        $mid = $pricing->quote(40);
        $this->assertEqualsWithDelta(50.0, $mid['bill'], 0.01);
        $this->assertGreaterThanOrEqual(0.15, $mid['margin']);
    }

    public function test_synthesizer_is_mock_not_live_aws(): void
    {
        $plan = (new AwsSynthesizer())->synthesise(DeclarativeSpec::fromArray([
            'language' => 'php',
            'framework' => 'laravel',
            'traffic' => 'low',
        ]));
        $this->assertFalse($plan['live_aws']);
        $env = (new SpinUp())->spin(DeclarativeSpec::fromArray([]), $plan);
        $this->assertSame(4 * 3600, $env['ttl_seconds']);
        $this->assertTrue($env['hibernates_after_ttl']);
        $this->assertSame(0, $env['forms']);
    }

    public function test_cost_guard_freezes_runaway(): void
    {
        $hit = (new CostGuard())->inspect(900, 40);
        $this->assertTrue($hit['frozen']);
    }
}

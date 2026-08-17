<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\MorphicMemory\AccessAnalyzer;
use App\MorphicMemory\LayoutPlanner;
use App\MorphicMemory\MorphicMemoryRegion;
use App\MorphicMemory\SelfAssessmentLoop;
use App\MorphicMemory\Support\LayoutKind;
use Tests\TestCase;

final class MorphicMemoryTest extends TestCase
{
    public function test_store_retrieve_query_are_layout_agnostic(): void
    {
        $region = new MorphicMemoryRegion();
        $region->store('corridor/a', ['x' => 1]);
        $region->store('room/rare', ['x' => 2]);
        $this->assertSame(['x' => 1], $region->retrieve('corridor/a'));
        $this->assertArrayHasKey('corridor/a', $region->query('corridor/'));
        $this->assertContains($region->layout(), LayoutKind::ALL);
    }

    public function test_analyzer_feeds_reorg_budget(): void
    {
        $analyzer = new AccessAnalyzer(32);
        for ($i = 0; $i < 20; $i++) {
            $analyzer->record('hot', 'read');
        }
        $stats = $analyzer->snapshot();
        $this->assertGreaterThan(0.5, $stats->locality);
        $this->assertGreaterThan(0.0, $stats->reorgBudget);
        $plan = (new LayoutPlanner())->propose($stats);
        $this->assertNotNull($plan);
        $this->assertSame(LayoutKind::CONTIGUOUS, $plan['from']);
    }

    public function test_self_assessment_reverts_when_metrics_worsen(): void
    {
        $loop = new SelfAssessmentLoop();
        $verdict = $loop->assess(
            ['avg_latency' => 1.0, 'energy_per_access' => 0.1],
            ['avg_latency' => 5.0, 'energy_per_access' => 0.9],
        );
        $this->assertTrue($verdict['revert']);
        $this->assertFalse($verdict['keep']);
    }
}

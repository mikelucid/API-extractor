<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\CognitiveFabric\CognitiveFabric;
use App\CognitiveFabric\Thought;
use Tests\TestCase;

final class CognitiveFabricTest extends TestCase
{
    public function test_baseline_has_128_cores_and_seven_ports(): void
    {
        $fabric = CognitiveFabric::baseline();
        $this->assertSame(128, count($fabric->cores));
        $this->assertSame(0, $fabric->hub->id);
        $this->assertCount(7, $fabric->cores[17]->ports);
        $this->assertArrayHasKey('PC', $fabric->cores[17]->ports);
        $this->assertNotEmpty($fabric->reports[17]);
        $this->assertArrayHasKey(0, $fabric->cores[17]->routingTable);
    }

    public function test_priority_thought_routes_toward_hub(): void
    {
        $fabric = CognitiveFabric::baseline();
        $start = 17;
        $fabric->inject($start, new Thought('t1', 'contain local session', 10.0, $start));
        for ($i = 0; $i < 16; $i++) {
            if ($fabric->hubHeapSize() > 0) {
                break;
            }
            $holder = null;
            foreach ($fabric->cores as $core) {
                if ($core->heap !== []) {
                    $holder = $core->id;
                    break;
                }
            }
            $this->assertNotNull($holder);
            $fabric->stepTowardHub($holder);
        }
        $this->assertGreaterThan(0, $fabric->hubHeapSize());
    }
}

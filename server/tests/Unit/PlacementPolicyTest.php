<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\CognitiveFabric\CognitiveFabric;
use App\CognitiveFabric\PlacementPolicy;
use App\CognitiveFabric\Thought;
use Tests\TestCase;

final class PlacementPolicyTest extends TestCase
{
    public function test_high_priority_thoughts_land_on_hub(): void
    {
        $fabric = CognitiveFabric::baseline();
        $policy = new PlacementPolicy();
        $core = $policy->place($fabric, new Thought('t', 'contain', 9.5, 17));
        $this->assertSame(0, $core);
    }
}

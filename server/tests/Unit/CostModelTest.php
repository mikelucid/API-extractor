<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\MorphicMemory\CostModel;
use App\MorphicMemory\Support\AccessStats;
use App\MorphicMemory\Support\LayoutKind;
use Tests\TestCase;

final class CostModelTest extends TestCase
{
    public function test_high_read_locality_prefers_columnar_over_contiguous(): void
    {
        $stats = new AccessStats(0.9, 0.1, 0.95, 0.8, 40, ['hot']);
        $model = new CostModel();
        $this->assertSame(LayoutKind::COLUMNAR, $model->choose(LayoutKind::CONTIGUOUS, $stats));
        $this->assertLessThan(
            $model->expectedCost(LayoutKind::CONTIGUOUS, $stats),
            $model->expectedCost(LayoutKind::COLUMNAR, $stats),
        );
    }
}

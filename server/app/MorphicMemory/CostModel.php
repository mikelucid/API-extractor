<?php

declare(strict_types=1);

namespace App\MorphicMemory;

use App\MorphicMemory\Support\AccessStats;
use App\MorphicMemory\Support\LayoutKind;

/**
 * Expected access cost per layout (Morphic Memory theorems 1–2).
 * Planner picks argmin_L (E[c_L] + λ · m(current, L)).
 */
final class CostModel
{
    public function __construct(private readonly float $lambda = 0.15)
    {
    }

    public function expectedCost(string $layout, AccessStats $stats): float
    {
        $pRead = $stats->readWriteAsymmetry;
        $pWrite = 1.0 - $pRead;
        $pScan = $stats->locality;
        $costs = $this->unitCosts($layout);

        return ($pRead * $costs['read']) + ($pWrite * $costs['write']) + ($pScan * $costs['scan']);
    }

    public function migrationCost(string $from, string $to): float
    {
        return $from === $to ? 0.0 : 0.25;
    }

    public function objective(string $current, string $candidate, AccessStats $stats): float
    {
        return $this->expectedCost($candidate, $stats) + ($this->lambda * $this->migrationCost($current, $candidate));
    }

    public function choose(string $current, AccessStats $stats): string
    {
        $best = $current;
        $bestScore = $this->objective($current, $current, $stats);
        foreach (LayoutKind::ALL as $layout) {
            $score = $this->objective($current, $layout, $stats);
            if ($score < $bestScore) {
                $best = $layout;
                $bestScore = $score;
            }
        }

        return $best;
    }

    /** @return array{read:float,write:float,scan:float} */
    private function unitCosts(string $layout): array
    {
        return match ($layout) {
            LayoutKind::COLUMNAR => ['read' => 0.2, 'write' => 0.8, 'scan' => 0.15],
            LayoutKind::SKIPLIST => ['read' => 0.25, 'write' => 0.35, 'scan' => 0.5],
            LayoutKind::BTREE => ['read' => 0.4, 'write' => 0.4, 'scan' => 0.4],
            LayoutKind::BLOOM_SLAB => ['read' => 0.3, 'write' => 0.9, 'scan' => 0.7],
            default => ['read' => 0.7, 'write' => 0.3, 'scan' => 0.25],
        };
    }
}

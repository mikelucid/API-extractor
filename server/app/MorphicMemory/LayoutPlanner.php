<?php

declare(strict_types=1);

namespace App\MorphicMemory;

use App\MorphicMemory\Support\AccessStats;
use App\MorphicMemory\Support\LayoutKind;

/**
 * Selects candidate layout mutations from analyzer output with a cost-benefit
 * heuristic that avoids pathological churn (Morphic Memory §3).
 */
final class LayoutPlanner
{
    private string $current = LayoutKind::CONTIGUOUS;

    private int $mutations = 0;

    private float $lastBudget = 0.0;

    public function current(): string
    {
        return $this->current;
    }

    public function propose(AccessStats $stats): ?array
    {
        if ($stats->reorgBudget < 0.35) {
            return null;
        }
        if ($this->mutations > 0 && abs($stats->reorgBudget - $this->lastBudget) < 0.05) {
            return null;
        }

        $target = $this->pick($stats);
        if ($target === $this->current) {
            return null;
        }

        $benefit = $stats->reorgBudget;
        $cost = 0.2 + (0.1 * $this->mutations);
        if ($benefit <= $cost) {
            return null;
        }

        return [
            'from' => $this->current,
            'to' => $target,
            'benefit' => $benefit,
            'cost' => $cost,
            'reason' => $this->reason($stats, $target),
        ];
    }

    public function commit(string $layout): void
    {
        $this->current = $layout;
        $this->mutations++;
        $this->lastBudget = 1.0;
    }

    private function pick(AccessStats $stats): string
    {
        if ($stats->locality > 0.7 && $stats->readWriteAsymmetry > 0.7) {
            return LayoutKind::COLUMNAR;
        }
        if ($stats->locality > 0.55) {
            return LayoutKind::SKIPLIST;
        }
        if ($stats->burstiness > 0.6) {
            return LayoutKind::BLOOM_SLAB;
        }
        if ($stats->touches > 24 && $stats->locality < 0.3) {
            return LayoutKind::BTREE;
        }

        return LayoutKind::CONTIGUOUS;
    }

    private function reason(AccessStats $stats, string $target): string
    {
        return sprintf(
            'locality=%.2f burst=%.2f rw=%.2f budget=%.2f → %s',
            $stats->locality,
            $stats->burstiness,
            $stats->readWriteAsymmetry,
            $stats->reorgBudget,
            $target,
        );
    }
}

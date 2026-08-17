<?php

declare(strict_types=1);

namespace App\MorphicMemory;

use App\MorphicMemory\Support\AccessStats;
use App\MorphicMemory\Support\AccessTrace;

/**
 * Rolling statistical model of access locality, burstiness, and read/write asymmetry.
 * Feeds a reorg-budget score to the Layout Planner (Morphic Memory §3).
 */
final class AccessAnalyzer
{
    /** @var list<AccessTrace> */
    private array $window = [];

    public function __construct(private readonly int $windowSize = 64)
    {
    }

    public function record(string $key, string $op = 'read', float $latencyMs = 0.0): AccessTrace
    {
        $trace = new AccessTrace($key, $op, microtime(true), $latencyMs);
        $this->window[] = $trace;
        if (count($this->window) > $this->windowSize) {
            $this->window = array_slice($this->window, -$this->windowSize);
        }

        return $trace;
    }

    public function snapshot(): AccessStats
    {
        $n = count($this->window);
        if ($n === 0) {
            return new AccessStats(0.0, 0.0, 0.5, 0.0, 0, []);
        }

        $keys = array_map(static fn (AccessTrace $t) => $t->key, $this->window);
        $unique = count(array_unique($keys));
        $locality = 1.0 - ($unique / $n);

        $intervals = [];
        for ($i = 1; $i < $n; $i++) {
            $intervals[] = max(1e-6, $this->window[$i]->at - $this->window[$i - 1]->at);
        }
        $burstiness = 0.0;
        if ($intervals !== []) {
            $mean = array_sum($intervals) / count($intervals);
            $var = 0.0;
            foreach ($intervals as $dt) {
                $var += ($dt - $mean) ** 2;
            }
            $std = sqrt($var / count($intervals));
            $burstiness = min(1.0, $std / ($mean + 1e-6));
        }

        $reads = count(array_filter($this->window, static fn (AccessTrace $t) => $t->op === 'read'));
        $writes = max(1, $n - $reads);
        $asymmetry = $reads / ($reads + $writes);

        $counts = [];
        foreach ($keys as $key) {
            $counts[$key] = ($counts[$key] ?? 0) + 1;
        }
        arsort($counts);
        $hotKeys = array_slice(array_keys($counts), 0, 8);

        $reorgBudget = min(1.0, ($locality * 0.5) + ($burstiness * 0.3) + (abs($asymmetry - 0.5) * 0.4));

        return new AccessStats($locality, $burstiness, $asymmetry, $reorgBudget, $n, $hotKeys);
    }
}

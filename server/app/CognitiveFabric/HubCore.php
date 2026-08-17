<?php

declare(strict_types=1);

namespace App\CognitiveFabric;

/**
 * Core 0: collects topology reports and broadcasts routing tables.
 */
final class HubCore extends Core
{
    /** @var array<int, array<string, int>> */
    private array $adjacency = [];

    public function __construct()
    {
        parent::__construct(0, true);
    }

    /** @param array<string, int> $neighbours */
    public function ingestReport(int $coreId, array $neighbours): void
    {
        $this->adjacency[$coreId] = $neighbours;
    }

    /**
     * Floyd–Warshall next-hop tables for 128 cores (document §2).
     *
     * @return array<int, array<int, array{port:string,core:int}|null>>
     */
    public function computeGlobalTopology(): array
    {
        $ids = array_keys($this->adjacency);
        sort($ids);
        $dist = [];
        $next = [];
        foreach ($ids as $i) {
            foreach ($ids as $j) {
                $dist[$i][$j] = $i === $j ? 0 : PHP_INT_MAX;
                $next[$i][$j] = null;
            }
            foreach ($this->adjacency[$i] as $port => $neighbour) {
                $dist[$i][$neighbour] = 1;
                $next[$i][$neighbour] = ['port' => $port, 'core' => $neighbour];
            }
        }
        foreach ($ids as $k) {
            foreach ($ids as $i) {
                foreach ($ids as $j) {
                    if ($dist[$i][$k] === PHP_INT_MAX || $dist[$k][$j] === PHP_INT_MAX) {
                        continue;
                    }
                    $via = $dist[$i][$k] + $dist[$k][$j];
                    if ($via < $dist[$i][$j]) {
                        $dist[$i][$j] = $via;
                        $next[$i][$j] = $next[$i][$k];
                    }
                }
            }
        }

        return $next;
    }
}

<?php

declare(strict_types=1);

namespace App\CognitiveFabric;

/**
 * 128-core hexagonal cognitive fabric with hub core 0 as priority sink.
 */
final class CognitiveFabric
{
    /** @var array<int, Core> */
    public array $cores = [];

    public readonly HubCore $hub;

    public readonly HexGrid $grid;

    public readonly TopologyDiscovery $discovery;

    /** @var array<int, array<string, int>> */
    public array $reports = [];

    public function __construct(?HexGrid $grid = null)
    {
        $this->grid = $grid ?? new HexGrid();
        $this->hub = new HubCore();
        $this->cores[0] = $this->hub;
        for ($i = 1; $i < $this->grid->size(); $i++) {
            $this->cores[$i] = new Core($i);
        }
        $this->discovery = new TopologyDiscovery($this->grid);
    }

    public static function baseline(): self
    {
        $fabric = new self();
        $fabric->boot();

        return $fabric;
    }

    public function boot(): void
    {
        $this->reports = $this->discovery->discover($this->cores, $this->hub);
    }

    public function inject(int $coreId, Thought $thought): void
    {
        $this->cores[$coreId]->receive($thought);
    }

    /**
     * Route the highest-priority thought on a core one hop toward the hub (core 0).
     */
    public function stepTowardHub(int $coreId): ?Thought
    {
        $core = $this->cores[$coreId];
        $thought = $core->popHighest();
        if ($thought === null) {
            return null;
        }
        if ($coreId === 0) {
            array_unshift($this->hub->heap, $thought);

            return $thought;
        }
        $hop = $core->routingTable[0] ?? null;
        $next = $hop['core'] ?? 0;
        $this->cores[$next]->receive($thought);

        return $thought;
    }

    public function hubHeapSize(): int
    {
        return count($this->hub->heap);
    }
}

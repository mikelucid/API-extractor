<?php

declare(strict_types=1);

namespace App\CognitiveFabric;

/**
 * Auto-discovery: HELLO on peripheral ports, topology report to hub (document §2).
 */
final class TopologyDiscovery
{
    public function __construct(private readonly HexGrid $grid)
    {
    }

    /**
     * @param array<int, Core> $cores
     * @return array<int, array<string, int>>
     */
    public function discover(array $cores, HubCore $hub): array
    {
        $reports = [];
        foreach ($cores as $core) {
            $neighbours = $this->grid->neighbours($core->id);
            foreach ($neighbours as $port => $nid) {
                $core->ports[$port]->neighbourId = $nid;
            }
            $reports[$core->id] = $neighbours;
            $hub->ingestReport($core->id, $neighbours);
        }
        $tables = $hub->computeGlobalTopology();
        foreach ($cores as $core) {
            $core->routingTable = [];
            foreach ($tables[$core->id] ?? [] as $target => $hop) {
                if ($hop !== null) {
                    $core->routingTable[$target] = $hop;
                }
            }
        }

        return $reports;
    }
}

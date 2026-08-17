<?php

declare(strict_types=1);

namespace App\CircuitBending;

/**
 * Owner-rights plugin analysis only. Universal reverse-engineering of third-party
 * compiled VSTs is refused (Circuit Bending VST document).
 */
final class OwnedPluginAnalyzer
{
    public function analyse(array $plugin): ParameterCircuit
    {
        if (empty($plugin['owner_owned'])) {
            throw new \InvalidArgumentException(
                'Third-party compiled plugins cannot be reverse-engineered. Supply an owner-owned, source-declared parameter graph.',
            );
        }
        if (! empty($plugin['compiled_binary']) && empty($plugin['declared_graph'])) {
            throw new \InvalidArgumentException(
                'A compiled binary without a declared graph is out of scope.',
            );
        }
        $graph = $plugin['declared_graph'] ?? ['nodes' => [], 'edges' => []];
        $nodes = $graph['nodes'] ?? [];
        $values = [];
        foreach ($nodes as $node) {
            $values[$node['id']] = $plugin['defaults'][$node['id']] ?? 0.5;
        }

        return new ParameterCircuit(new CircuitGraph($nodes, $graph['edges'] ?? []), $values);
    }

    public function apply(ParameterCircuit $circuit, Patch $patch): ParameterCircuit
    {
        foreach ($patch->values as $id => $value) {
            $circuit->set($id, $value);
        }
        $edges = array_merge($circuit->graph->edges, $patch->extraWires);

        return new ParameterCircuit(new CircuitGraph($circuit->graph->nodes, $edges), $circuit->values);
    }

    public function export(ParameterCircuit $circuit, string $name): array
    {
        return [
            'name' => $name,
            'owner_owned' => true,
            'values' => $circuit->values,
            'graph' => [
                'nodes' => $circuit->graph->nodes,
                'edges' => $circuit->graph->edges,
            ],
        ];
    }
}

<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\CircuitBending\OwnedPluginAnalyzer;
use App\CircuitBending\Patch;
use Tests\TestCase;

final class CircuitBendingTest extends TestCase
{
    public function test_owner_declared_graph_can_be_patched(): void
    {
        $analyzer = new OwnedPluginAnalyzer();
        $circuit = $analyzer->analyse([
            'owner_owned' => true,
            'declared_graph' => [
                'nodes' => [
                    ['id' => 'cutoff', 'kind' => 'filter'],
                    ['id' => 'res', 'kind' => 'filter'],
                ],
                'edges' => [['from' => 'cutoff', 'to' => 'res']],
            ],
            'defaults' => ['cutoff' => 0.4],
        ]);
        $patched = $analyzer->apply($circuit, new Patch('open', ['cutoff' => 0.9], [['from' => 'res', 'to' => 'cutoff']]));
        $this->assertEqualsWithDelta(0.9, $patched->values['cutoff'], 0.001);
        $export = $analyzer->export($patched, 'mine');
        $this->assertTrue($export['owner_owned']);
    }

    public function test_third_party_binary_is_rejected(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        (new OwnedPluginAnalyzer())->analyse([
            'owner_owned' => false,
            'compiled_binary' => true,
        ]);
    }
}

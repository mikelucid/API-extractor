<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Http\Controllers\MapController;
use App\Http\Controllers\StatusController;
use App\Providers\Rootv2ServiceProvider;
use Tests\TestCase;

final class LaravelSurfaceTest extends TestCase
{
    public function test_document_map_covers_every_domain_folder(): void
    {
        $map = (new MapController())->show()['documents'];
        $this->assertSame('app/MorphicMemory', $map['morphic_memory']);
        $this->assertSame('app/Decision', $map['live_rating']);
        $this->assertSame('app/CognitiveFabric', $map['cognitive_fabric']);
        $this->assertSame('app/AmorphousFabric', $map['amorphous_adaptive']);
        $this->assertSame('app/AgentQuery', $map['agent_query']);
        $this->assertSame('app/CircuitBending', $map['circuit_bending']);
        $this->assertSame('app/SealedVault', $map['sealed_vault']);
        $this->assertSame('app/Supervisor', $map['rootv2_supervisor']);
        foreach (['app/MorphicMemory', 'app/Decision', 'app/CognitiveFabric', 'app/AmorphousFabric', 'app/AgentQuery', 'app/CircuitBending', 'app/SealedVault', 'app/Supervisor'] as $dir) {
            $this->assertDirectoryExists(dirname(__DIR__, 2).'/'.$dir);
        }
    }

    public function test_service_provider_binds_document_domains(): void
    {
        $bindings = (new Rootv2ServiceProvider())->register();
        $this->assertArrayHasKey(\App\MorphicMemory\MorphicMemoryRegion::class, $bindings);
        $this->assertArrayHasKey(\App\CognitiveFabric\CognitiveFabric::class, $bindings);
        $status = (new StatusController())->show();
        $this->assertSame(128, $status['fabric_cores']);
        $this->assertSame(29.0, $status['pricing_floor']);
        $this->assertFalse($status['decentral']->torrent);
    }
}

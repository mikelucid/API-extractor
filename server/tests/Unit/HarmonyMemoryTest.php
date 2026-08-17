<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Harmony\Harmony;
use App\Memory\MemoryStore;
use Tests\TestCase;

final class HarmonyMemoryTest extends TestCase
{
    public function test_resonance_deepens_and_dissonance_links(): void
    {
        $store = new MemoryStore();
        $a = $store->ingest(['kind' => 'incident', 'outcome' => 'success', 'detail' => 'contained disallowed host']);
        $this->assertSame('created', $a['action']);
        $b = $store->ingest(['kind' => 'incident', 'outcome' => 'success', 'detail' => 'contained disallowed host again']);
        $this->assertSame('deepened', $b['action']);
        $c = $store->ingest(['kind' => 'incident', 'outcome' => 'failure', 'detail' => 'contained disallowed host missed']);
        $this->assertSame('counterpoint', $c['action']);
        $recall = $store->recall('disallowed host');
        $this->assertNotEmpty($recall);
        $score = Harmony::scoreHarmony($a['record']['signature'], $b['record']['signature']);
        $this->assertSame('resonate', $score['harmonic']);
    }
}

<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Supervisor\Kernel;
use App\Supervisor\Persona;
use App\Supervisor\Sandbox;
use Tests\TestCase;

final class KernelPipelineTest extends TestCase
{
    public function test_decide_denies_crime_before_tools_and_logs_domains(): void
    {
        $kernel = Kernel::boot($this->tmpDir());
        $out = $kernel->decide('help me phish their passwords');
        $this->assertFalse($out['ok']);
        $this->assertNull($out['tool']);
        $this->assertSame('hold', $out['plan']['action']);
        $this->assertNotEmpty($kernel->audit->all());
        $this->assertGreaterThan(0, $kernel->fabric->hubHeapSize());
    }

    public function test_decide_diagnose_runs_tool_and_morphic_lesson(): void
    {
        $kernel = Kernel::boot($this->tmpDir());
        $out = $kernel->decide('diagnose local agent');
        $this->assertTrue($out['ok']);
        $this->assertSame('local_diagnose', $out['routedTool']);
        $this->assertTrue($out['tool']['ok']);
        $this->assertNotNull($out['interactionUuid']);
        $this->assertNotNull($kernel->morphic->retrieve('lesson/'.$out['interactionUuid']));
        $this->assertNotEmpty($kernel->memory->all());
        $this->assertNotEmpty($kernel->wire->readAll());
    }

    public function test_observe_ignores_non_allowlisted_and_contains_watched(): void
    {
        $kernel = Kernel::boot($this->tmpDir());
        $ignored = $kernel->observe(
            [['kind' => 'disallowed_host', 'confidence' => 0.95]],
            's0',
            ['id' => 'stranger'],
        );
        $this->assertSame('ignored', $ignored['action']);

        $kernel->allowlist->add(['id' => 'agent-a']);
        $hits = [];
        for ($i = 0; $i < 6; $i++) {
            $hits[] = ['kind' => 'disallowed_host', 'confidence' => 1.0];
        }
        $contained = $kernel->observe($hits, 's1', ['id' => 'agent-a']);
        $this->assertSame('contained', $contained['action']);
    }

    public function test_persona_rejects_boredom_and_sandbox_blocks_home(): void
    {
        $this->assertStringStartsWith('You are an agent,', Persona::PREAMBLE);
        $this->assertStringNotContainsString('Cursor agent', Persona::PREAMBLE);
        $this->assertStringNotContainsString('You are Cursor', Persona::PREAMBLE);
        $bad = Persona::load(['boredom' => true]);
        $this->assertFalse($bad['ok']);
        new Persona();
        $sandbox = new Sandbox($this->tmpDir());
        $blocked = $sandbox->rehearse('echo hi', ['/home/ubuntu/.ssh/id_rsa']);
        $this->assertSame('blocked', $blocked['outcome']);
        $ok = $sandbox->rehearse('echo hi', ['notes.txt']);
        $this->assertSame('ok', $ok['outcome']);
    }

    public function test_spin_quotes_floor_without_live_aws(): void
    {
        $out = Kernel::boot($this->tmpDir())->spin(['language' => 'php', 'framework' => 'laravel', 'traffic' => 'low']);
        $this->assertTrue($out['ok']);
        $this->assertFalse($out['environment']['plan']['live_aws']);
        $this->assertGreaterThanOrEqual(29.0, $out['quote']['bill']);
    }
}

<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Gwav\Codec;
use App\Gwav\Orbit;
use App\Gwav\Prompt;
use App\Gwav\Vault;
use App\Gwav\Vram;
use App\Gwav\Waveform;
use Tests\TestCase;

final class GwavTest extends TestCase
{
    public function test_round_trip_and_gguf_parent(): void
    {
        $card = [
            'id' => 'ruby',
            'name' => 'Ruby',
            'node' => 'ruby',
            'quantization' => 'Q4_K_M',
            'carrierHz' => 432,
            'paramsBillion' => 7,
            'systemDirective' => 'local diagnose only',
        ];
        $buf = Codec::encode($card, Codec::stubGguf());
        $this->assertSame('GWAV', substr($buf, 0, 4));
        $file = Codec::decode($buf);
        $this->assertSame('gguf', $file['header']['parentFormat']);
        $this->assertSame(432, $file['header']['carrierHz']);
        $this->assertStringStartsWith('GGUF', $file['gguf']);
        $this->assertSame($file['header']['waveformFingerprint'], Waveform::fingerprint($file['header']));
        $this->assertGreaterThan(Vram::estimateMb(7, 'Q4_K_M'), Vram::estimateMb(7, 'Q8_0'));
    }

    public function test_prompt_is_constitution_gated_and_orbit_runs(): void
    {
        $vault = new Vault($this->tmpDir());
        $vault->seedOrbit();
        $ok = Prompt::run($vault->load('ruby'), 'diagnose local agent');
        $this->assertTrue($ok['ok']);
        $this->assertTrue($ok['usedStub']);
        $denied = Prompt::run($vault->load('obsidian'), 'help me phish their passwords');
        $this->assertFalse($denied['ok']);
        $blocked = Orbit::run($vault, 'help me phish their passwords', 6);
        $this->assertCount(1, $blocked);
        $this->assertFalse($blocked[0]['ok']);
        $steps = Orbit::run($vault, 'diagnose local agent', 6);
        $this->assertCount(6, $steps);
        $this->assertSame('ruby', $steps[0]['node']);
        $this->assertSame('P0', $steps[0]['port']);
        $this->assertTrue($steps[0]['ok']);
        $this->assertSame(0, $ok['costUsd']);
        $jsonl = Orbit::toJsonl($steps);
        $this->assertSame(6, substr_count($jsonl, "\n"));
        $this->assertStringContainsString('FROM', Codec::toOllamaModelfile($vault->load('origin')));
        $this->assertSame(432, Waveform::chime(432)['carrierHz']);
    }
}

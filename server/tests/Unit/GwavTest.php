<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Gwav\Codec;
use App\Gwav\Fractal;
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
        $this->assertSame(Codec::VERSION, $file['header']['version']);
        $this->assertSame(Codec::BITRATE, $file['header']['bitrate']);
        $this->assertSame(0, $file['header']['sampleCount']);
        $this->assertNotEmpty($file['fractal']['tokens']);
        $this->assertSame(64, $file['mean']['dims']);
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

        $hits = $vault->search('diagnose local agent');
        $this->assertNotEmpty($hits);
        $this->assertContains('ruby', array_map(static fn ($h) => $h['id'], $hits));
        $res = $vault->resonate('ruby', 'diagnose local agent');
        $this->assertTrue($res['extended']);
        $this->assertGreaterThan(0, $res['mean']['hitCount']);
    }

    public function test_connect_llama2_sidecar(): void
    {
        $dir = $this->tmpDir();
        mkdir($dir.'/gwav/models', 0777, true);
        $gguf = $dir.'/gwav/models/llama2.gguf';
        file_put_contents($gguf, Codec::stubGguf());
        $vault = new Vault($dir);
        $linked = $vault->connectGguf('llama2', $gguf);
        $this->assertSame($gguf, $linked['sidecarGguf']);
        $file = $vault->load('llama2');
        $this->assertSame($gguf, $file['header']['sidecarGguf']);
        $prompt = Prompt::run($file, 'diagnose local agent', 'local_diagnose', $dir);
        $this->assertTrue($prompt['ok']);
        $this->assertSame('stub', $prompt['backend']);
        $this->assertSame($gguf, $prompt['ggufPath']);
    }

    public function test_rejects_truncated_binary_fields(): void
    {
        try {
            Codec::decode('GWAV'.pack('V', Codec::VERSION).str_repeat("\0", 4));
            $this->fail('Expected a truncated v2 header to be rejected.');
        } catch (\InvalidArgumentException $error) {
            $this->assertStringContainsString('Truncated .gwav v2 header', $error->getMessage());
        }

        $truncatedChunk = 'GWAV'
            .pack('V', Codec::VERSION)
            .pack('V', 1)
            .pack('V', Codec::BITRATE)
            .pack('V', 432)
            .pack('V', 0)
            .'meta'.pack('V', 10).'x';
        try {
            Codec::decode($truncatedChunk);
            $this->fail('Expected a truncated chunk to be rejected.');
        } catch (\InvalidArgumentException $error) {
            $this->assertStringContainsString('Truncated .gwav chunk', $error->getMessage());
        }

        foreach (["", pack('V', 1)."\x02x"] as $chunk) {
            try {
                Fractal::decodeChunk($chunk, 432);
                $this->fail('Expected a truncated fractal chunk to be rejected.');
            } catch (\InvalidArgumentException $error) {
                $this->assertStringContainsString('Truncated fractal', $error->getMessage());
            }
        }

        $mean = pack('VV', 2, 0).pack('d', 1.0);
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Truncated harmonic mean chunk');
        Fractal::decodeMean($mean);
    }

    public function test_rejects_oversized_fractal_strings(): void
    {
        $fractal = [
            'tokens' => [[
                'field' => str_repeat('f', 256),
                'token' => 'ok',
                'scales' => [],
            ]],
        ];
        try {
            Fractal::encodeChunk($fractal);
            $this->fail('Expected an oversized fractal field to be rejected.');
        } catch (\InvalidArgumentException $error) {
            $this->assertStringContainsString('field exceeds 255 UTF-8 bytes', $error->getMessage());
        }

        $fractal['tokens'][0]['field'] = 'id';
        $fractal['tokens'][0]['token'] = str_repeat('é', 128);
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('token exceeds 255 UTF-8 bytes');
        Fractal::encodeChunk($fractal);
    }

    public function test_resonating_a_v1_card_persists_v2_metadata(): void
    {
        $dir = $this->tmpDir();
        $vault = new Vault($dir);
        $card = [
            'id' => 'legacy',
            'name' => 'Legacy',
            'node' => 'ruby',
            'quantization' => 'Q4_K_M',
            'carrierHz' => 432,
            'paramsBillion' => 7,
            'systemDirective' => 'local diagnose agent session',
            'constitutionBound' => true,
            'parentFormat' => 'gguf',
        ];
        $header = $card + [
            'format' => 'gwav',
            'version' => Codec::VERSION_V1,
            'bitrate' => 123,
            'sampleCount' => 99,
            'waveformFingerprint' => Waveform::fingerprint($card),
        ];
        $json = json_encode($header, JSON_THROW_ON_ERROR);
        file_put_contents($vault->pathFor('legacy'), 'GWAV'.pack('V', Codec::VERSION_V1).pack('V', strlen($json)).$json);

        $result = $vault->resonate('legacy', 'diagnose local agent');
        $this->assertTrue($result['extended']);
        $reloaded = $vault->load('legacy');
        $this->assertSame(Codec::VERSION, $reloaded['header']['version']);
        $this->assertSame(Codec::BITRATE, $reloaded['header']['bitrate']);
        $this->assertSame(0, $reloaded['header']['sampleCount']);
        $this->assertSame([], glob($vault->dir().'/*.tmp-*') ?: []);
    }

    public function test_vault_rejects_invalid_identifiers(): void
    {
        $vault = new Vault($this->tmpDir());
        foreach (['', '../ruby', 'ruby/gwav', 'ruby.gwav', "ruby\nother"] as $id) {
            try {
                $vault->pathFor($id);
                $this->fail('Expected invalid card identifier to be rejected.');
            } catch (\InvalidArgumentException) {
                $this->addToAssertionCount(1);
            }
        }
        $this->assertStringEndsWith('/ruby-1_ok.gwav', $vault->pathFor('ruby-1_ok'));
    }
}

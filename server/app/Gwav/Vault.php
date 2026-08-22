<?php

declare(strict_types=1);

namespace App\Gwav;

final class Vault
{
    public const NODES = ['origin', 'ruby', 'sapphire', 'emerald', 'amethyst', 'topaz', 'obsidian'];

    public function __construct(private readonly string $rootDir)
    {
        $dir = $this->dir();
        if (! is_dir($dir)) {
            mkdir($dir, 0777, true);
        }
    }

    public function dir(): string
    {
        return rtrim($this->rootDir, '/').'/gwav/vault';
    }

    public function pathFor(string $id): string
    {
        return $this->dir().'/'.$id.'.gwav';
    }

    public function forge(array $input): array
    {
        $node = $input['node'] ?? 'origin';
        $card = [
            'id' => $input['id'],
            'name' => $input['name'] ?? $input['id'],
            'node' => $node,
            'quantization' => $input['quantization'] ?? 'Q4_K_M',
            'carrierHz' => $input['carrierHz'] ?? 432,
            'paramsBillion' => $input['paramsBillion'] ?? 7,
            'systemDirective' => $input['systemDirective'] ?? $this->directive($node),
            'constitutionBound' => true,
            'parentFormat' => 'gguf',
        ];
        if (! empty($input['sidecarGguf'])) {
            $card['sidecarGguf'] = $input['sidecarGguf'];
        }
        if (! empty($input['loraAdapters']) && is_array($input['loraAdapters'])) {
            $card['loraAdapters'] = array_values($input['loraAdapters']);
        }
        $gguf = ! empty($input['embedStubGguf']) ? Codec::stubGguf() : '';
        $buf = Codec::encode($card, $gguf);
        file_put_contents($this->pathFor($card['id']), $buf);

        return Codec::decode($buf);
    }

    public function seedOrbit(): array
    {
        $out = [];
        foreach (self::NODES as $i => $node) {
            $out[] = $this->forge([
                'id' => $node,
                'node' => $node,
                'carrierHz' => $i % 2 === 0 ? 432 : 528,
                'quantization' => $i < 4 ? 'Q4_K_M' : 'Q8_0',
                'embedStubGguf' => true,
            ]);
        }

        return $out;
    }

    public function load(string $id): array
    {
        $p = $this->pathFor($id);
        if (! is_file($p)) {
            throw new \RuntimeException('No .gwav card in vault: '.$id);
        }

        return Codec::decode((string) file_get_contents($p));
    }

    public function list(): array
    {
        $files = glob($this->dir().'/*.gwav') ?: [];
        $out = [];
        foreach ($files as $file) {
            $decoded = Codec::decode((string) file_get_contents($file));
            $h = $decoded['header'];
            $out[] = [
                'id' => $h['id'],
                'node' => $h['node'],
                'carrierHz' => $h['carrierHz'],
                'vramMb' => Vram::estimateMb((float) $h['paramsBillion'], (string) $h['quantization']),
                'fingerprint' => $h['waveformFingerprint'],
            ];
        }

        return $out;
    }

    public function search(string $query): array
    {
        $results = [];
        foreach ($this->list() as $row) {
            $file = $this->load($row['id']);
            $match = Resonance::match($file['fractal'], $query);
            if ($match['score'] > 0) {
                $results[] = [
                    'id' => $row['id'],
                    'score' => $match['score'],
                    'harmonic' => $match['harmonic'],
                    'hits' => count($match['hits']),
                ];
            }
        }
        usort($results, static fn ($a, $b) => $b['score'] <=> $a['score']);

        return $results;
    }

    public function resonate(string $id, string $query): array
    {
        $file = $this->load($id);
        $out = Resonance::resonateFile($file, $query);
        if ($out['extended']) {
            $file['mean'] = $out['mean'];
            file_put_contents($this->pathFor($id), Codec::reencode($file));
        }

        return [
            'match' => $out['match'],
            'mean' => ['hitCount' => $out['mean']['hitCount']],
            'extended' => $out['extended'],
        ];
    }

    private function directive(string $node): string
    {
        return match ($node) {
            'ruby' => 'Ruby ignition: short decisive local diagnose; never assist crime or remote hacking.',
            'sapphire' => 'Sapphire depth: slow recall of prior lessons; stay on the owner allowlist.',
            'emerald' => 'Emerald durable knowledge: prefer morphic memory hits over speculation.',
            'amethyst' => 'Amethyst critique: lightweight critic of plans; fail closed on unknown intent.',
            'topaz' => 'Topaz clarity: owner-status and health only unless constitution allows more.',
            'obsidian' => 'Obsidian contain: watch for disallowed hosts and runaway spawn.',
            default => 'Hub origin: bind constitution first; absorb neighbor reflections without overriding deny.',
        };
    }
}

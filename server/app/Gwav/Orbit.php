<?php

declare(strict_types=1);

namespace App\Gwav;

final class Orbit
{
    public const NODE_TO_PORT = [
        'origin' => 'PC',
        'ruby' => 'P0',
        'sapphire' => 'P1',
        'emerald' => 'P2',
        'amethyst' => 'P3',
        'topaz' => 'P4',
        'obsidian' => 'P5',
    ];

    public static function run(Vault $vault, string $seed, int $steps = 6): array
    {
        $ring = array_values(array_filter(Vault::NODES, static fn ($n) => $n !== 'origin'));
        $out = [];
        $last = $seed;
        $lastNode = 'origin';
        for ($i = 0; $i < $steps; $i++) {
            $node = $ring[$i % count($ring)];
            $file = $vault->load($node);
            $result = Prompt::run($file, $last, 'local_diagnose');
            $line = $result['ok'] ? ($result['answer'] ?? '') : ('hold: '.($result['reason'] ?? ''));
            $out[] = [
                'node' => $node,
                'port' => self::NODE_TO_PORT[$node] ?? 'PC',
                'absorbedFrom' => $lastNode,
                'line' => $line,
                'ok' => $result['ok'],
                'costUsd' => 0,
            ];
            $last = $line;
            $lastNode = $node;
            if (! $result['ok']) {
                break;
            }
        }

        return $out;
    }

    public static function toJsonl(array $steps): string
    {
        $lines = [];
        foreach ($steps as $s) {
            $lines[] = json_encode([
                'node' => $s['node'],
                'port' => $s['port'] ?? null,
                'absorbedFrom' => $s['absorbedFrom'],
                'completion' => $s['line'],
                'ok' => $s['ok'],
                'costUsdPerMillionTokens' => 0,
            ], JSON_THROW_ON_ERROR);
        }

        return $lines === [] ? '' : implode("\n", $lines)."\n";
    }
}

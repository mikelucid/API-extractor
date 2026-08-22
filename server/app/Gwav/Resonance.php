<?php

declare(strict_types=1);

namespace App\Gwav;

final class Resonance
{
    public const THRESHOLD = 0.35;

    public static function match(array $fractal, string $query): array
    {
        $qFractal = Fractal::build([
            'id' => 'query',
            'name' => 'query',
            'node' => 'origin',
            'quantization' => 'Q4_K_M',
            'carrierHz' => $fractal['carrierHz'],
            'paramsBillion' => 0,
            'systemDirective' => $query,
        ]);
        $hits = [];
        $scoreSum = 0.0;
        $pairs = 0;
        foreach ($qFractal['tokens'] as $qTok) {
            foreach ($fractal['tokens'] as $entry) {
                if ($qTok['token'] !== $entry['token']) {
                    continue;
                }
                foreach ($qTok['scales'] as $si => $qs) {
                    $es = $entry['scales'][$si];
                    $score = $qs['amplitude'] * $es['amplitude'] * cos($qs['phase'] - $es['phase']);
                    if ($score > 0.05) {
                        $hits[] = [
                            'field' => $entry['field'],
                            'token' => $entry['token'],
                            'queryToken' => $qTok['token'],
                            'scale' => $si,
                            'score' => $score,
                        ];
                        $scoreSum += $score;
                        $pairs++;
                    }
                }
            }
        }
        $queryTokens = \App\Harmony\Harmony::tokenize($query);
        $indexTokens = array_column($fractal['tokens'], 'token');
        $overlap = count($queryTokens) === 0 ? 0.0 : count(array_intersect($queryTokens, $indexTokens)) / count($queryTokens);
        $score = $pairs === 0 ? $overlap * 0.5 : $scoreSum / $pairs;
        $harmonic = ($score >= self::THRESHOLD || $overlap >= self::THRESHOLD) ? 'resonate' : 'neutral';

        return compact('score', 'overlap', 'hits', 'harmonic');
    }

    public static function resonateFile(array $file, string $query): array
    {
        $fractal = $file['fractal'] ?? Fractal::build($file['header']);
        $match = self::match($fractal, $query);
        $base = $file['mean'] ?? Fractal::initialMean($fractal);
        if ($match['harmonic'] !== 'resonate') {
            return ['match' => $match, 'mean' => $base, 'extended' => false];
        }
        $qMean = Fractal::initialMean(Fractal::build([
            'id' => 'query',
            'name' => 'query',
            'node' => 'origin',
            'quantization' => 'Q4_K_M',
            'carrierHz' => $fractal['carrierHz'],
            'paramsBillion' => 0,
            'systemDirective' => $query,
        ]));
        $weight = max(1, (int) round($match['score'] * 10));

        return [
            'match' => $match,
            'mean' => Fractal::extendMean($base, $qMean['vector'], (float) $weight),
            'extended' => true,
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Harmony;

final class Harmony
{
    private const STOP = ['a', 'an', 'the', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'with', 'is', 'at', 'by', 'from', 'that', 'this', 'it'];

    public static function tokenize(string $text): array
    {
        $seen = [];
        $out = [];
        foreach (preg_split('/[^a-z0-9]+/', strtolower($text)) ?: [] as $raw) {
            if (strlen($raw) < 2 || in_array($raw, self::STOP, true) || isset($seen[$raw])) {
                continue;
            }
            $seen[$raw] = true;
            $out[] = $raw;
        }

        return $out;
    }

    public static function polarityOf(string $outcome): int
    {
        return match ($outcome) {
            'success' => 1,
            'failure' => -1,
            default => 0,
        };
    }

    public static function signatureOf(array $input): array
    {
        return [
            'kind' => $input['kind'],
            'polarity' => self::polarityOf($input['outcome']),
            'tokens' => self::tokenize($input['kind'].' '.$input['detail']),
        ];
    }

    public static function scoreHarmony(array $a, array $b): array
    {
        $overlap = self::jaccard($a['tokens'], $b['tokens']);
        if ($a['kind'] === $b['kind']) {
            $overlap = min(1.0, $overlap + 0.15);
        }
        $polarity = $a['polarity'] * $b['polarity'];
        if ($overlap < 0.2) {
            return ['harmonic' => 'neutral', 'score' => $overlap, 'overlap' => $overlap];
        }
        if ($polarity < 0) {
            return ['harmonic' => 'dissonate', 'score' => -$overlap, 'overlap' => $overlap];
        }

        return ['harmonic' => 'resonate', 'score' => $overlap, 'overlap' => $overlap];
    }

    public static function jaccard(array $a, array $b): float
    {
        $left = array_unique($a);
        $right = array_unique($b);
        if ($left === [] && $right === []) {
            return 0.0;
        }
        $inter = count(array_intersect($left, $right));
        $union = count($left) + count($right) - $inter;

        return $union === 0 ? 0.0 : $inter / $union;
    }
}

<?php

declare(strict_types=1);

namespace App\Gwav;

final class Vram
{
    public static function estimateMb(float $paramsBillion, string $quant): int
    {
        $bytes = $quant === 'Q8_0' ? 1.1 : 0.62;

        return (int) round(($paramsBillion * 1e9 * $bytes) / 1e6);
    }
}

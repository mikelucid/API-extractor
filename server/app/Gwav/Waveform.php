<?php

declare(strict_types=1);

namespace App\Gwav;

final class Waveform
{
    public static function fingerprint(array $card): string
    {
        $hz = (int) ($card['carrierHz'] ?? 432);
        $samples = [];
        for ($i = 0; $i < 64; $i++) {
            $samples[] = pack('d', sin(2 * M_PI * $hz * $i / 44100));
        }
        $basis = ($card['id'] ?? '').'|'.($card['node'] ?? '').'|'.($card['quantization'] ?? '').'|'.$hz.'|'.($card['systemDirective'] ?? '');

        return hash('sha256', $basis.implode('', $samples));
    }

    /** @return array{carrierHz:int,sampleRate:int,samples:list<float>} */
    public static function chime(int $hz, int $n = 16): array
    {
        $samples = [];
        for ($i = 0; $i < $n; $i++) {
            $samples[] = sin(2 * M_PI * $hz * $i / 44100);
        }

        return ['carrierHz' => $hz, 'sampleRate' => 44100, 'samples' => $samples];
    }
}

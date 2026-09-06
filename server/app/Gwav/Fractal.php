<?php

declare(strict_types=1);

namespace App\Gwav;

final class Fractal
{
    public const BITRATE = 1_400_000;

    public const MEAN_DIMS = 64;

    public const SCALES = 4;

    private const FIELDS = ['id', 'name', 'node', 'quantization', 'systemDirective'];

    public static function phase(string $token, string $field, int $scale, int $carrierHz): float
    {
        $u = hexdec(substr(hash('sha256', $field.'|'.$token.'|'.$scale), 0, 8)) / 0xffffffff;
        $freq = ($carrierHz * (2 ** $scale)) / self::BITRATE;

        return sin(2 * M_PI * $freq * $u * 1024);
    }

    public static function amplitude(int $scale): float
    {
        return 1 / (2 ** $scale);
    }

    public static function build(array $card): array
    {
        $tokens = [];
        foreach (self::FIELDS as $field) {
            $raw = (string) ($card[$field] ?? '');
            foreach (\App\Harmony\Harmony::tokenize($raw) as $token) {
                $scales = [];
                for ($s = 0; $s < self::SCALES; $s++) {
                    $scales[] = [
                        'scale' => $s,
                        'phase' => self::phase($token, $field, $s, (int) $card['carrierHz']),
                        'amplitude' => self::amplitude($s),
                    ];
                }
                $tokens[] = ['field' => $field, 'token' => $token, 'scales' => $scales];
            }
        }

        return [
            'carrierHz' => (int) $card['carrierHz'],
            'bitrate' => self::BITRATE,
            'tokens' => $tokens,
        ];
    }

    public static function initialMean(array $fractal): array
    {
        $vector = array_fill(0, self::MEAN_DIMS, 0.0);
        $weightSum = 0.0;
        foreach ($fractal['tokens'] as $entry) {
            $finest = $entry['scales'][self::SCALES - 1];
            $v = self::tokenVector($entry['token'], $entry['field'], (int) $fractal['carrierHz']);
            foreach ($vector as $i => $_) {
                $vector[$i] += $v[$i] * $finest['amplitude'];
            }
            $weightSum += $finest['amplitude'];
        }
        if ($weightSum > 0) {
            foreach ($vector as $i => $val) {
                $vector[$i] = $val / $weightSum;
            }
        }

        return ['dims' => self::MEAN_DIMS, 'vector' => $vector, 'hitCount' => 0];
    }

    /** @return list<float> */
    public static function tokenVector(string $token, string $field, int $carrierHz): array
    {
        $out = [];
        for ($i = 0; $i < self::MEAN_DIMS; $i++) {
            $out[] = self::phase($token, $field, $i % self::SCALES, $carrierHz);
        }

        return $out;
    }

    public static function encodeChunk(array $fractal): string
    {
        $out = pack('V', count($fractal['tokens']));
        foreach ($fractal['tokens'] as $entry) {
            $field = $entry['field'];
            $token = $entry['token'];
            if (strlen($field) > 0xff) {
                throw new \InvalidArgumentException('Fractal field exceeds 255 UTF-8 bytes.');
            }
            if (strlen($token) > 0xff) {
                throw new \InvalidArgumentException('Fractal token exceeds 255 UTF-8 bytes.');
            }
            $out .= chr(strlen($field)).$field.chr(strlen($token)).$token.chr(count($entry['scales']));
            foreach ($entry['scales'] as $s) {
                $out .= chr($s['scale']).pack('d', $s['phase']).pack('d', $s['amplitude']);
            }
        }

        return $out;
    }

    public static function decodeChunk(string $buf, int $carrierHz): array
    {
        $length = strlen($buf);
        if ($length < 4) {
            throw new \InvalidArgumentException('Truncated fractal chunk.');
        }
        $count = unpack('V', substr($buf, 0, 4))[1];
        $offset = 4;
        $tokens = [];
        for ($n = 0; $n < $count; $n++) {
            if ($offset >= $length) {
                throw new \InvalidArgumentException('Truncated fractal token field length.');
            }
            $fieldLen = ord($buf[$offset]);
            $offset++;
            if ($fieldLen > $length - $offset) {
                throw new \InvalidArgumentException('Truncated fractal token field.');
            }
            $field = substr($buf, $offset, $fieldLen);
            $offset += $fieldLen;
            if ($offset >= $length) {
                throw new \InvalidArgumentException('Truncated fractal token length.');
            }
            $tokenLen = ord($buf[$offset]);
            $offset++;
            if ($tokenLen > $length - $offset) {
                throw new \InvalidArgumentException('Truncated fractal token data.');
            }
            $token = substr($buf, $offset, $tokenLen);
            $offset += $tokenLen;
            if ($offset >= $length) {
                throw new \InvalidArgumentException('Truncated fractal scale count.');
            }
            $scaleCount = ord($buf[$offset]);
            $offset++;
            $scales = [];
            for ($s = 0; $s < $scaleCount; $s++) {
                if (17 > $length - $offset) {
                    throw new \InvalidArgumentException('Truncated fractal scale.');
                }
                $scale = ord($buf[$offset]);
                $phase = unpack('d', substr($buf, $offset + 1, 8))[1];
                $amp = unpack('d', substr($buf, $offset + 9, 8))[1];
                $scales[] = ['scale' => $scale, 'phase' => $phase, 'amplitude' => $amp];
                $offset += 17;
            }
            $tokens[] = ['field' => $field, 'token' => $token, 'scales' => $scales];
        }

        return ['carrierHz' => $carrierHz, 'bitrate' => self::BITRATE, 'tokens' => $tokens];
    }

    public static function encodeMean(array $mean): string
    {
        $out = pack('VV', $mean['dims'], $mean['hitCount']);
        foreach ($mean['vector'] as $v) {
            $out .= pack('d', $v);
        }

        return $out;
    }

    public static function decodeMean(string $buf): array
    {
        $length = strlen($buf);
        if ($length < 8) {
            throw new \InvalidArgumentException('Truncated harmonic mean chunk.');
        }
        $dims = unpack('V', substr($buf, 0, 4))[1];
        $hitCount = unpack('V', substr($buf, 4, 4))[1];
        $expectedLength = 8 + $dims * 8;
        if ($length < $expectedLength) {
            throw new \InvalidArgumentException('Truncated harmonic mean chunk.');
        }
        if ($length !== $expectedLength) {
            throw new \InvalidArgumentException('Corrupt harmonic mean chunk length.');
        }
        $vector = [];
        for ($i = 0; $i < $dims; $i++) {
            $vector[] = unpack('d', substr($buf, 8 + $i * 8, 8))[1];
        }

        return ['dims' => $dims, 'vector' => $vector, 'hitCount' => $hitCount];
    }

    public static function extendMean(array $mean, array $queryVector, float $weight): array
    {
        $next = [];
        $total = $mean['hitCount'] + $weight;
        foreach ($mean['vector'] as $i => $v) {
            $next[] = ($v * $mean['hitCount'] + $queryVector[$i] * $weight) / $total;
        }

        return ['dims' => $mean['dims'], 'vector' => $next, 'hitCount' => (int) round($total)];
    }
}

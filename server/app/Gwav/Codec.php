<?php

declare(strict_types=1);

namespace App\Gwav;

final class Codec
{
    public const MAGIC = 'GWAV';

    public const VERSION_V1 = 1;

    public const VERSION = 2;

    public const BITRATE = 1_400_000;

    private const FLAG_NO_DURATION = 1;

    public static function encode(array $card, string $gguf = ''): string
    {
        $header = $card + [
            'format' => 'gwav',
            'version' => self::VERSION,
            'constitutionBound' => true,
            'parentFormat' => 'gguf',
            'bitrate' => self::BITRATE,
            'sampleCount' => 0,
            'waveformFingerprint' => Waveform::fingerprint($card),
        ];
        $fractal = Fractal::build($card);
        $mean = Fractal::initialMean($fractal);
        $body = self::chunk('fmt ', self::fmtChunk((int) $card['carrierHz']))
            .self::chunk('meta', json_encode($header, JSON_THROW_ON_ERROR))
            .self::chunk('frct', Fractal::encodeChunk($fractal))
            .self::chunk('mean', Fractal::encodeMean($mean))
            .self::chunk('gguf', $gguf);

        return self::MAGIC
            .pack('V', self::VERSION)
            .pack('V', self::FLAG_NO_DURATION)
            .pack('V', self::BITRATE)
            .pack('V', (int) $card['carrierHz'])
            .pack('V', 0)
            .$body;
    }

    public static function reencode(array $file): string
    {
        $header = $file['header'] + ['version' => self::VERSION, 'bitrate' => self::BITRATE, 'sampleCount' => 0];
        $fractal = $file['fractal'] ?? Fractal::build($header);
        $mean = $file['mean'] ?? Fractal::initialMean($fractal);

        return self::MAGIC
            .pack('V', self::VERSION)
            .pack('V', self::FLAG_NO_DURATION)
            .pack('V', self::BITRATE)
            .pack('V', (int) $header['carrierHz'])
            .pack('V', 0)
            .self::chunk('fmt ', self::fmtChunk((int) $header['carrierHz']))
            .self::chunk('meta', json_encode($header, JSON_THROW_ON_ERROR))
            .self::chunk('frct', Fractal::encodeChunk($fractal))
            .self::chunk('mean', Fractal::encodeMean($mean))
            .self::chunk('gguf', $file['gguf']);
    }

    public static function decode(string $buf): array
    {
        if (strlen($buf) < 12) {
            throw new \InvalidArgumentException('Not a .gwav file (too short).');
        }
        if (substr($buf, 0, 4) !== self::MAGIC) {
            throw new \InvalidArgumentException('Not a .gwav file.');
        }
        $version = unpack('V', substr($buf, 4, 4))[1];
        if ($version === self::VERSION_V1) {
            return self::decodeV1($buf);
        }
        if ($version !== self::VERSION) {
            throw new \InvalidArgumentException('Unsupported .gwav version.');
        }

        return self::decodeV2($buf);
    }

    private static function decodeV1(string $buf): array
    {
        $len = unpack('V', substr($buf, 8, 4))[1];
        $header = json_decode(substr($buf, 12, $len), true, 512, JSON_THROW_ON_ERROR);
        self::validateHeader($header);
        $gguf = substr($buf, 12 + $len);
        if ($gguf !== '' && ! str_starts_with($gguf, 'GGUF')) {
            throw new \InvalidArgumentException('Embedded payload is not GGUF.');
        }
        $fractal = Fractal::build($header);

        return [
            'header' => $header + ['version' => self::VERSION, 'bitrate' => self::BITRATE, 'sampleCount' => 0],
            'gguf' => $gguf,
            'fractal' => $fractal,
            'mean' => Fractal::initialMean($fractal),
        ];
    }

    private static function decodeV2(string $buf): array
    {
        if (unpack('V', substr($buf, 12, 4))[1] !== self::BITRATE) {
            throw new \InvalidArgumentException('.gwav bitrate must be '.self::BITRATE.'.');
        }
        if (unpack('V', substr($buf, 20, 4))[1] !== 0) {
            throw new \InvalidArgumentException('.gwav v2 must have sampleCount 0 (no duration).');
        }
        $chunks = self::parseChunks(substr($buf, 24));
        $meta = $chunks['meta'] ?? null;
        if ($meta === null) {
            throw new \InvalidArgumentException('.gwav v2 missing meta chunk.');
        }
        $header = json_decode($meta, true, 512, JSON_THROW_ON_ERROR);
        self::validateHeader($header);
        $gguf = $chunks['gguf'] ?? '';
        if ($gguf !== '' && ! str_starts_with($gguf, 'GGUF')) {
            throw new \InvalidArgumentException('Embedded payload is not GGUF.');
        }
        $fractal = isset($chunks['frct'])
            ? Fractal::decodeChunk($chunks['frct'], (int) $header['carrierHz'])
            : Fractal::build($header);

        return [
            'header' => $header,
            'gguf' => $gguf,
            'fractal' => $fractal,
            'mean' => isset($chunks['mean']) ? Fractal::decodeMean($chunks['mean']) : Fractal::initialMean($fractal),
        ];
    }

    private static function validateHeader(array $header): void
    {
        if (($header['format'] ?? '') !== 'gwav' || ($header['parentFormat'] ?? '') !== 'gguf' || empty($header['constitutionBound'])) {
            throw new \InvalidArgumentException('Invalid .gwav header.');
        }
        if (($header['waveformFingerprint'] ?? '') !== Waveform::fingerprint($header)) {
            throw new \InvalidArgumentException('.gwav waveform fingerprint mismatch.');
        }
    }

    /** @return array<string, string> */
    private static function parseChunks(string $buf): array
    {
        $chunks = [];
        $offset = 0;
        while ($offset + 8 <= strlen($buf)) {
            $id = substr($buf, $offset, 4);
            $size = unpack('V', substr($buf, $offset + 4, 4))[1];
            $offset += 8;
            $chunks[$id] = substr($buf, $offset, $size);
            $offset += $size;
        }

        return $chunks;
    }

    private static function chunk(string $fourcc, string $data): string
    {
        return $fourcc.pack('V', strlen($data)).$data;
    }

    private static function fmtChunk(int $carrierHz): string
    {
        return pack('vvVVvv', 0x4757, 1, $carrierHz, self::BITRATE, 8, 64);
    }

    public static function stubGguf(): string
    {
        return 'GGUF'.pack('V', 3).str_repeat("\0", 8);
    }

    public static function toOllamaModelfile(array $file): string
    {
        $header = $file['header'];
        $from = $header['sidecarGguf'] ?? ($file['gguf'] !== '' ? './weights.gguf' : 'scratch');

        return "# Generated from {$header['id']}.gwav (GGUF upgrade, carrier {$header['carrierHz']} Hz, bitrate ".self::BITRATE.")\nFROM {$from}\nSYSTEM \"\"\"{$header['systemDirective']}\"\"\"\nPARAMETER temperature 0.7\nPARAMETER top_p 0.9\n";
    }
}

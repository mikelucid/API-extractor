<?php

declare(strict_types=1);

namespace App\Gwav;

final class Codec
{
    public const MAGIC = 'GWAV';

    public const VERSION = 1;

    public static function encode(array $card, string $gguf = ''): string
    {
        $header = $card + [
            'format' => 'gwav',
            'version' => self::VERSION,
            'constitutionBound' => true,
            'parentFormat' => 'gguf',
            'waveformFingerprint' => Waveform::fingerprint($card),
        ];
        $json = json_encode($header, JSON_THROW_ON_ERROR);

        return self::MAGIC.pack('V', self::VERSION).pack('V', strlen($json)).$json.$gguf;
    }

    public static function decode(string $buf): array
    {
        if (strlen($buf) < 12) {
            throw new \InvalidArgumentException('Not a .gwav file (too short).');
        }
        $magic = substr($buf, 0, 4);
        if ($magic !== self::MAGIC) {
            throw new \InvalidArgumentException("Not a .gwav file (magic {$magic}).");
        }
        $un = unpack('Vversion/Vlen', substr($buf, 4, 8));
        if (($un['version'] ?? 0) !== self::VERSION) {
            throw new \InvalidArgumentException('Unsupported .gwav version.');
        }
        $len = (int) $un['len'];
        $header = json_decode(substr($buf, 12, $len), true, 512, JSON_THROW_ON_ERROR);
        if (($header['format'] ?? '') !== 'gwav' || ($header['parentFormat'] ?? '') !== 'gguf' || empty($header['constitutionBound'])) {
            throw new \InvalidArgumentException('Invalid .gwav header.');
        }
        $expected = Waveform::fingerprint($header);
        if (($header['waveformFingerprint'] ?? '') !== $expected) {
            throw new \InvalidArgumentException('.gwav waveform fingerprint mismatch.');
        }
        $gguf = substr($buf, 12 + $len);
        if ($gguf !== '' && ! str_starts_with($gguf, 'GGUF')) {
            throw new \InvalidArgumentException('Embedded payload is not GGUF.');
        }

        return ['header' => $header, 'gguf' => $gguf];
    }

    public static function stubGguf(): string
    {
        return 'GGUF'.pack('V', 3).str_repeat("\0", 8);
    }

    public static function toOllamaModelfile(array $file): string
    {
        $header = $file['header'];
        $from = $header['sidecarGguf'] ?? ($file['gguf'] !== '' ? './weights.gguf' : 'scratch');

        return "# Generated from {$header['id']}.gwav (GGUF parent, carrier {$header['carrierHz']} Hz)\nFROM {$from}\nSYSTEM \"\"\"{$header['systemDirective']}\"\"\"\nPARAMETER temperature 0.7\nPARAMETER top_p 0.9\n";
    }
}

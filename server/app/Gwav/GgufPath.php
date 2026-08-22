<?php

declare(strict_types=1);

namespace App\Gwav;

final class GgufPath
{
    public const DEFAULT_LLAMA2_ID = 'llama2';

    public const DEFAULT_FILENAME = 'llama2.gguf';

    public static function modelsDir(string $rootDir): string
    {
        return rtrim($rootDir, '/').'/gwav/models';
    }

    public static function isValidGguf(string $path): bool
    {
        if (! is_file($path) || ! is_readable($path)) {
            return false;
        }
        $h = fopen($path, 'rb');
        if ($h === false) {
            return false;
        }
        $magic = fread($h, 4);
        fclose($h);

        return $magic === 'GGUF';
    }

    public static function findLlama2(string $rootDir): ?string
    {
        $candidates = array_filter([
            getenv('LLAMA2_GGUF') ?: null,
            getenv('GWAV_GGUF_PATH') ?: null,
            self::modelsDir($rootDir).'/'.self::DEFAULT_FILENAME,
            self::modelsDir($rootDir).'/llama2.guff',
        ]);
        foreach ($candidates as $path) {
            if (self::isValidGguf($path)) {
                return realpath($path) ?: $path;
            }
        }

        return null;
    }

    public static function resolveSidecar(array $file, string $rootDir): ?string
    {
        $header = $file['header'];
        $candidates = array_filter([
            $header['sidecarGguf'] ?? null,
            getenv('LLAMA2_GGUF') ?: null,
            self::findLlama2($rootDir),
        ]);
        foreach ($candidates as $path) {
            if (self::isValidGguf($path)) {
                return realpath($path) ?: $path;
            }
        }

        return null;
    }
}

<?php

declare(strict_types=1);

namespace App\AgentQuery;

/**
 * Append-only JSONL of router/tool wire events. Redacts secret-like keys.
 */
final class WireLogger
{
    private const FORBIDDEN = ['password', 'secret', 'privatekey', 'identitybody', 'apikey', 'authorization'];

    public function __construct(
        private readonly string $rootDir,
        private readonly string $domain = 'cursor-rootv2.local',
    ) {
    }

    public function log(string $api, array $request, ?array $response = null, ?string $error = null): array
    {
        $entry = [
            'uuid' => bin2hex(random_bytes(8)),
            'domain' => $this->domain,
            'timestamp' => gmdate('c'),
            'api' => $api,
            'request' => $this->scrub($request),
        ];
        if ($response !== null) {
            $entry['response'] = $this->scrub($response);
        }
        if ($error !== null) {
            $entry['error'] = $error;
        }
        $file = $this->path();
        $dir = dirname($file);
        if (! is_dir($dir)) {
            mkdir($dir, 0777, true);
        }
        file_put_contents($file, json_encode($entry).PHP_EOL, FILE_APPEND);

        return $entry;
    }

    /** @return list<array<string, mixed>> */
    public function readAll(): array
    {
        $file = $this->path();
        if (! is_file($file)) {
            return [];
        }
        $out = [];
        foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
            $out[] = json_decode($line, true);
        }

        return $out;
    }

    private function path(): string
    {
        return rtrim($this->rootDir, '/').'/wire.jsonl';
    }

    private function scrub(array $value): array
    {
        $out = [];
        foreach ($value as $k => $v) {
            $lk = strtolower((string) $k);
            $blocked = false;
            foreach (self::FORBIDDEN as $needle) {
                if (str_contains($lk, $needle)) {
                    $blocked = true;
                    break;
                }
            }
            if ($blocked) {
                $out[$k] = '[redacted]';
            } elseif (is_array($v)) {
                $out[$k] = $this->scrub($v);
            } else {
                $out[$k] = $v;
            }
        }

        return $out;
    }
}

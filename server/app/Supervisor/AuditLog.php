<?php

declare(strict_types=1);

namespace App\Supervisor;

/**
 * Owner-readable append-only audit (JSONL on disk + in-memory). Identity bodies redacted.
 */
final class AuditLog
{
    private const REDACT = ['identityPayload', 'secret', 'privateKey', 'password', 'apiKey'];

    /** @var list<array<string, mixed>> */
    private array $events = [];

    public function __construct(private readonly ?string $rootDir = null)
    {
        if ($this->rootDir && is_file($this->path())) {
            foreach (file($this->path(), FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
                $decoded = json_decode($line, true);
                if (is_array($decoded)) {
                    $this->events[] = $decoded;
                }
            }
        }
    }

    public function append(array $event): array
    {
        $event = $this->redact($event);
        $event['at'] = $event['at'] ?? gmdate('c');
        $this->events[] = $event;
        if ($this->rootDir) {
            $dir = dirname($this->path());
            if (! is_dir($dir)) {
                mkdir($dir, 0777, true);
            }
            file_put_contents($this->path(), json_encode($event).PHP_EOL, FILE_APPEND);
        }

        return $event;
    }

    /** @return list<array<string, mixed>> */
    public function all(): array
    {
        return $this->events;
    }

    private function path(): string
    {
        return rtrim((string) $this->rootDir, '/').'/audit.jsonl';
    }

    private function redact(array $event): array
    {
        foreach (self::REDACT as $key) {
            if (array_key_exists($key, $event)) {
                $event[$key] = '[redacted]';
            }
        }

        return $event;
    }
}

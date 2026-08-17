<?php

declare(strict_types=1);

namespace App\AgentQuery;

/**
 * Local JSON interaction log from the Agent Query / Router extracts. No swarm transfer.
 */
final class InteractionLogger
{
    /** @var list<array<string, mixed>> */
    private array $entries = [];

    public function __construct(private readonly string $rootDir, private readonly string $domain = 'cursor-rootv2.local')
    {
        $file = $this->path();
        if (is_file($file)) {
            $parsed = json_decode((string) file_get_contents($file), true);
            $this->entries = $parsed['entries'] ?? [];
        }
    }

    public function addEntry(array $input): array
    {
        $entry = [
            'uuid' => $input['uuid'] ?? $this->uuid(),
            'domain' => $this->domain,
            'timestamp' => gmdate('c'),
            'userId' => $input['userId'] ?? 'owner',
            'groupId' => $input['groupId'] ?? 'local',
            'topic' => $input['topic'],
            'request' => $input['request'],
            'bestAnswer' => $input['bestAnswer'],
            'apiUsed' => $input['apiUsed'],
            'rating' => $input['rating'] ?? 0,
            'tags' => $input['tags'] ?? [],
        ];
        $this->entries[] = $entry;
        $this->save();

        return $entry;
    }

    /** @return list<array<string, mixed>> */
    public function all(): array
    {
        return $this->entries;
    }

    private function path(): string
    {
        return rtrim($this->rootDir, '/').'/interactions.json';
    }

    private function save(): void
    {
        $dir = dirname($this->path());
        if (! is_dir($dir)) {
            mkdir($dir, 0777, true);
        }
        file_put_contents($this->path(), json_encode(['entries' => $this->entries], JSON_PRETTY_PRINT));
    }

    private function uuid(): string
    {
        $b = random_bytes(16);
        $b[6] = chr((ord($b[6]) & 0x0f) | 0x40);
        $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
    }
}

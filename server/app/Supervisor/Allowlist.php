<?php

declare(strict_types=1);

namespace App\Supervisor;

final class Allowlist
{
    /** @param list<array{id:string,argvPrefix?:string,absolutePath?:string}> $entries */
    public function __construct(private array $entries = [])
    {
    }

    public static function empty(): self
    {
        return new self();
    }

    public function add(array $entry): void
    {
        $this->entries = array_values(array_filter(
            $this->entries,
            static fn ($e) => $e['id'] !== $entry['id'],
        ));
        $this->entries[] = $entry;
    }

    public function isAllowlisted(array $candidate): bool
    {
        foreach ($this->entries as $entry) {
            if (! empty($candidate['id']) && $entry['id'] === $candidate['id']) {
                return true;
            }
            if (! empty($entry['absolutePath']) && ($candidate['absolutePath'] ?? null) === $entry['absolutePath']) {
                return true;
            }
            if (! empty($entry['argvPrefix']) && str_starts_with((string) ($candidate['argv'] ?? ''), $entry['argvPrefix'])) {
                return true;
            }
        }

        return false;
    }

    public function entries(): array
    {
        return $this->entries;
    }
}

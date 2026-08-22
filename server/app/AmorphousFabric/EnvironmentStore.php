<?php

declare(strict_types=1);

namespace App\AmorphousFabric;

final class EnvironmentStore
{
    private string $path;

    public function __construct(string $dataDir)
    {
        $this->path = rtrim($dataDir, '/').'/environments.json';
        if (! is_dir(dirname($this->path))) {
            mkdir(dirname($this->path), 0777, true);
        }
        if (! is_file($this->path)) {
            file_put_contents($this->path, json_encode([], JSON_PRETTY_PRINT));
        }
    }

    public function all(): array
    {
        return $this->read();
    }

    public function find(string $id): ?array
    {
        foreach ($this->read() as $env) {
            if (($env['id'] ?? '') === $id) {
                return $env;
            }
        }

        return null;
    }

    public function save(array $environment): array
    {
        $items = $this->read();
        $found = false;
        foreach ($items as $i => $item) {
            if (($item['id'] ?? '') === ($environment['id'] ?? '')) {
                $items[$i] = $environment;
                $found = true;
                break;
            }
        }
        if (! $found) {
            $items[] = $environment;
        }
        file_put_contents($this->path, json_encode(array_values($items), JSON_PRETTY_PRINT));

        return $environment;
    }

    public function updateStatus(string $id, string $status): ?array
    {
        $env = $this->find($id);
        if ($env === null) {
            return null;
        }
        $env['status'] = $status;
        $env['updated_at'] = gmdate('c');

        return $this->save($env);
    }

    public function delete(string $id): bool
    {
        $before = $this->read();
        $items = array_values(array_filter(
            $before,
            static fn (array $env): bool => ($env['id'] ?? '') !== $id,
        ));
        file_put_contents($this->path, json_encode($items, JSON_PRETTY_PRINT));

        return count($items) < count($before);
    }

    private function read(): array
    {
        $raw = json_decode((string) file_get_contents($this->path), true);

        return is_array($raw) ? $raw : [];
    }
}

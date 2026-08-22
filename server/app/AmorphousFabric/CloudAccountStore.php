<?php

declare(strict_types=1);

namespace App\AmorphousFabric;

final class CloudAccountStore
{
    private string $path;

    public function __construct(string $dataDir)
    {
        $this->path = rtrim($dataDir, '/').'/cloud_accounts.json';
        if (! is_dir(dirname($this->path))) {
            mkdir(dirname($this->path), 0777, true);
        }
        if (! is_file($this->path)) {
            file_put_contents($this->path, json_encode([], JSON_PRETTY_PRINT));
        }
    }

    public function all(): array
    {
        return array_map(fn (array $a) => $this->redact($a), $this->read());
    }

    public function find(string $id): ?array
    {
        foreach ($this->read() as $account) {
            if (($account['id'] ?? '') === $id) {
                return $this->redact($account);
            }
        }

        return null;
    }

    public function save(array $account): array
    {
        $items = $this->read();
        $found = false;
        foreach ($items as $i => $item) {
            if (($item['id'] ?? '') === ($account['id'] ?? '')) {
                $items[$i] = $account;
                $found = true;
                break;
            }
        }
        if (! $found) {
            $items[] = $account;
        }
        file_put_contents($this->path, json_encode(array_values($items), JSON_PRETTY_PRINT));

        return $this->redact($account);
    }

    public function delete(string $id): bool
    {
        $before = count($this->read());
        $items = array_values(array_filter(
            $this->read(),
            static fn (array $a): bool => ($a['id'] ?? '') !== $id,
        ));
        file_put_contents($this->path, json_encode($items, JSON_PRETTY_PRINT));

        return count($items) < $before;
    }

    private function read(): array
    {
        $raw = json_decode((string) file_get_contents($this->path), true);

        return is_array($raw) ? $raw : [];
    }

    private function redact(array $account): array
    {
        if (isset($account['secret_key'])) {
            $account['secret_key'] = '••••'.substr((string) $account['secret_key'], -4);
        }
        if (isset($account['service_account_json'])) {
            $account['service_account_json'] = '[redacted]';
        }

        return $account;
    }
}

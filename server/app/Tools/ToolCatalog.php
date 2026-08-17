<?php

declare(strict_types=1);

namespace App\Tools;

final class ToolCatalog
{
    /** @var array<string, callable> */
    private array $adapters = [];

    /** @var list<string> */
    private array $allowed;

    public function __construct(bool $allowImageGen = false)
    {
        $this->allowed = [
            'local_diagnose',
            'contain_session',
            'sandbox_rehearsal',
            'owner_status',
            'identity_resolve',
            'hold',
        ];
        if ($allowImageGen) {
            $this->allowed[] = 'image_gen';
        }
        $stub = static fn (string $id, string $text): array => [
            'ok' => true,
            'toolId' => $id,
            'usedStub' => true,
            'payload' => ['echo' => $text],
        ];
        foreach ($this->allowed as $id) {
            $this->adapters[$id] = $stub;
        }
        $this->adapters['image_gen'] = static function (string $id, string $text) use ($allowImageGen): array {
            if (! $allowImageGen) {
                return [
                    'ok' => false,
                    'toolId' => $id,
                    'usedStub' => true,
                    'payload' => [],
                    'error' => 'Tool image_gen is not on the owner allowlist.',
                ];
            }

            return ['ok' => true, 'toolId' => $id, 'usedStub' => true, 'payload' => ['prompt' => $text]];
        };
    }

    public function execute(string $toolId, string $text): array
    {
        if (! in_array($toolId, $this->allowed, true)) {
            return [
                'ok' => false,
                'toolId' => $toolId,
                'usedStub' => true,
                'payload' => [],
                'error' => "Tool {$toolId} is not on the owner allowlist.",
            ];
        }
        $adapter = $this->adapters[$toolId] ?? null;
        if ($adapter === null) {
            return [
                'ok' => false,
                'toolId' => $toolId,
                'usedStub' => true,
                'payload' => [],
                'error' => "No adapter registered for {$toolId}.",
            ];
        }

        return $adapter($toolId, $text);
    }
}

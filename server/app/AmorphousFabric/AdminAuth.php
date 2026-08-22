<?php

declare(strict_types=1);

namespace App\AmorphousFabric;

final class AdminAuth
{
    public function __construct(private readonly string $token)
    {
    }

    public static function fromEnv(): self
    {
        return new self(getenv('AMORPHOUS_ADMIN_TOKEN') ?: 'amorphous-super-admin-dev');
    }

    public function authorize(array $input): bool
    {
        $provided = (string) ($input['admin_token'] ?? $input['Authorization'] ?? '');
        if (str_starts_with($provided, 'Bearer ')) {
            $provided = substr($provided, 7);
        }

        return hash_equals($this->token, $provided);
    }

    public function require(array $input): ?array
    {
        if ($this->authorize($input)) {
            return null;
        }

        return ['ok' => false, 'error' => 'unauthorized', 'message' => 'Super admin token required.'];
    }
}

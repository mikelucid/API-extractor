<?php

declare(strict_types=1);

namespace App\AmorphousFabric;

/**
 * One-click generative sandbox: free tier on spot with a hard TTL, then hibernate.
 */
final class SpinUp
{
    public function __construct(private readonly int $freeTtlHours = 4)
    {
    }

    public function spin(DeclarativeSpec $spec, array $plan, bool $paid = false): array
    {
        $ttl = $paid ? null : $this->freeTtlHours * 3600;
        $id = bin2hex(random_bytes(8));
        $provider = $plan['provider'] ?? 'aws';
        $slug = substr($id, 0, 8);

        return [
            'id' => $id,
            'url' => "https://{$slug}.amorphous.dev",
            'status' => 'materialised',
            'paid' => $paid,
            'spot' => ! $paid,
            'provider' => $provider,
            'ttl_seconds' => $ttl,
            'hibernates_after_ttl' => ! $paid,
            'credit_card_required' => $paid,
            'forms' => 0,
            'created_at' => gmdate('c'),
            'plan' => $plan,
            'spec' => [
                'language' => $spec->language,
                'framework' => $spec->framework,
                'provider' => $spec->provider,
            ],
        ];
    }

    public function hibernate(array $environment): array
    {
        $environment['status'] = 'hibernated';
        $environment['ttl_seconds'] = 0;

        return $environment;
    }
}

<?php

declare(strict_types=1);

namespace App\AmorphousFabric;

final class SynthesizerFactory
{
    public static function make(string $provider = 'aws'): CloudProviderInterface
    {
        return match (strtolower($provider)) {
            'gcp', 'google', 'google_cloud' => new GcpSynthesizer(),
            default => new AwsSynthesizer(),
        };
    }
}

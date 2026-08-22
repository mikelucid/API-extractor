<?php

declare(strict_types=1);

namespace App\AmorphousFabric;

/**
 * Synthesises a unique right-sized Google Cloud *plan*. Never calls live GCP APIs.
 */
final class GcpSynthesizer implements CloudProviderInterface
{
    public function __construct(private readonly TemplateLibrary $templates = new TemplateLibrary())
    {
    }

    public function provider(): string
    {
        return 'gcp';
    }

    public function synthesise(DeclarativeSpec $spec): array
    {
        $template = $this->templates->resolve($spec);
        $mix = match ($spec->traffic) {
            'high' => ['cloud_run' => 2, 'gke' => 1, 'cloud_functions' => 0, 'preemptible' => 1],
            'medium' => ['cloud_run' => 0, 'gke' => 0, 'cloud_functions' => 2, 'preemptible' => 1],
            default => ['cloud_run' => 1, 'gke' => 0, 'cloud_functions' => 1, 'preemptible' => 1],
        };

        $cloudCost = match ($spec->traffic) {
            'high' => 165.0,
            'medium' => 42.0,
            default => 7.0,
        };
        if (in_array('postgres', $spec->dataStores, true) || in_array('redis', $spec->dataStores, true)) {
            $cloudCost += 18.0;
        }

        return [
            'live_cloud' => false,
            'provider' => 'gcp',
            'region' => $spec->region ?? 'us-central1',
            'template' => $template,
            'mix' => $mix,
            'estimated_aws_usd' => $cloudCost,
            'estimated_cloud_usd' => $cloudCost,
            'tags' => ['rootv2', 'amorphous', $spec->language, 'gcp'],
        ];
    }
}

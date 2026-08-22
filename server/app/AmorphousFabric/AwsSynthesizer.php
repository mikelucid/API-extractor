<?php

declare(strict_types=1);

namespace App\AmorphousFabric;

/**
 * Synthesises a unique right-sized AWS *plan*. Never calls live AWS APIs.
 */
final class AwsSynthesizer implements CloudProviderInterface
{
    public function __construct(private readonly TemplateLibrary $templates = new TemplateLibrary())
    {
    }

    public function provider(): string
    {
        return 'aws';
    }

    public function synthesise(DeclarativeSpec $spec): array
    {
        $template = $this->templates->resolve($spec);
        $mix = match ($spec->traffic) {
            'high' => ['ec2' => 2, 'fargate' => 1, 'lambda' => 0, 'spot' => 1],
            'medium' => ['ec2' => 0, 'fargate' => 1, 'lambda' => 1, 'spot' => 1],
            default => ['ec2' => 0, 'fargate' => 0, 'lambda' => 1, 'spot' => 1],
        };

        $awsCost = match ($spec->traffic) {
            'high' => 180.0,
            'medium' => 48.0,
            default => 8.0,
        };
        if (in_array('postgres', $spec->dataStores, true) || in_array('redis', $spec->dataStores, true)) {
            $awsCost += 20.0;
        }

        return [
            'live_aws' => false,
            'live_cloud' => false,
            'provider' => 'aws',
            'region' => $spec->region,
            'template' => $template,
            'mix' => $mix,
            'estimated_aws_usd' => $awsCost,
            'estimated_cloud_usd' => $awsCost,
            'tags' => ['rootv2', 'amorphous', $spec->language],
        ];
    }
}

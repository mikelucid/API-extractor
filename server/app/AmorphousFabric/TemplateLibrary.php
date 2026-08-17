<?php

declare(strict_types=1);

namespace App\AmorphousFabric;

/**
 * Curated architecture templates. Co-creation registry from the Amorphous Adaptive model.
 */
final class TemplateLibrary
{
    /** @return array<string, array<string, mixed>> */
    public function all(): array
    {
        return [
            'php-laravel' => [
                'compute' => 'fargate',
                'instance' => 'spot',
                'managed' => ['rds' => false, 'elasticache' => false],
            ],
            'node-edge' => [
                'compute' => 'lambda',
                'instance' => 'spot',
                'managed' => ['rds' => false, 'elasticache' => false],
            ],
            'heavy-ml' => [
                'compute' => 'ec2',
                'instance' => 'on_demand',
                'managed' => ['rds' => true, 'elasticache' => true],
            ],
        ];
    }

    public function resolve(DeclarativeSpec $spec): array
    {
        $key = strtolower($spec->language.'-'.$spec->framework);
        $all = $this->all();
        if (isset($all[$key])) {
            return $all[$key];
        }
        if ($spec->traffic === 'high') {
            return $all['heavy-ml'];
        }

        return $all['php-laravel'];
    }
}

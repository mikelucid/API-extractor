<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Supervisor\Kernel;

final class AmorphousController
{
    public function quote(array $input): array
    {
        return Kernel::boot()->quote($input);
    }

    public function spin(array $input): array
    {
        return Kernel::boot()->spin($input, (bool) ($input['paid'] ?? false));
    }

    public function environments(): array
    {
        $envs = Kernel::boot()->environments->all();

        return ['ok' => true, 'environments' => $envs];
    }

    public function providers(): array
    {
        return [
            'ok' => true,
            'providers' => [
                [
                    'id' => 'aws',
                    'name' => 'Amazon Web Services',
                    'regions' => ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'],
                    'services' => ['EC2', 'Fargate', 'Lambda', 'Spot'],
                    'connect' => 'IAM role or access keys',
                ],
                [
                    'id' => 'gcp',
                    'name' => 'Google Cloud',
                    'regions' => ['us-central1', 'us-east1', 'europe-west1', 'asia-southeast1'],
                    'services' => ['Cloud Run', 'Cloud Functions', 'GKE', 'Preemptible'],
                    'connect' => 'Service account JSON',
                ],
            ],
        ];
    }
}

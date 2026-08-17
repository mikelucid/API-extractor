<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Supervisor\Kernel;

final class AmorphousController
{
    public function quote(array $input): array
    {
        $kernel = Kernel::boot();
        $plan = $kernel->synthesizer->synthesise(\App\AmorphousFabric\DeclarativeSpec::fromArray($input));

        return [
            'plan' => $plan,
            'quote' => $kernel->pricing->quote($plan['estimated_aws_usd']),
        ];
    }

    public function spin(array $input): array
    {
        return Kernel::boot()->spin($input, (bool) ($input['paid'] ?? false));
    }
}

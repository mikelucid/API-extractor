<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\AgentQuery\DecentralPolicy;
use App\AmorphousFabric\Pricing;
use App\CognitiveFabric\CognitiveFabric;
use App\Supervisor\Constitution;
use App\Supervisor\IdentityVault;

final class StatusController
{
    public function show(): array
    {
        $config = require dirname(__DIR__, 3).'/config/rootv2.php';

        return [
            'service' => 'rootv2-server',
            'constitution' => (new Constitution($config['constitution_version']))->evaluate('status of local supervisor'),
            'fabric_cores' => CognitiveFabric::baseline()->grid->size(),
            'pricing_floor' => (new Pricing())->quote(0)['bill'],
            'decentral' => DecentralPolicy::localOnly(),
            'identity_unsupported' => IdentityVault::unsupportedApis(),
        ];
    }
}

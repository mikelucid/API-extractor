<?php

declare(strict_types=1);

namespace App\Http\Controllers;

final class MapController
{
    public function show(): array
    {
        return [
            'documents' => [
                'morphic_memory' => 'app/MorphicMemory',
                'live_rating' => 'app/Decision',
                'cognitive_fabric' => 'app/CognitiveFabric',
                'amorphous_adaptive' => 'app/AmorphousFabric',
                'agent_query' => 'app/AgentQuery',
                'circuit_bending' => 'app/CircuitBending',
                'sealed_vault' => 'app/SealedVault',
                'upgrade_brief' => ['app/Router', 'app/Tools', 'app/Fallback', 'app/Thought', 'app/Escalation'],
                'rootv2_supervisor' => 'app/Supervisor',
                'gwav' => 'app/Gwav',
            ],
        ];
    }
}

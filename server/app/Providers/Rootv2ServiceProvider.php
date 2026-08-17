<?php

declare(strict_types=1);

namespace App\Providers;

use App\AgentQuery\DecentralPolicy;
use App\AgentQuery\EmbeddingIndex;
use App\AgentQuery\InteractionLogger;
use App\AgentQuery\WireLogger;
use App\AmorphousFabric\AwsSynthesizer;
use App\AmorphousFabric\CostGuard;
use App\AmorphousFabric\Pricing;
use App\AmorphousFabric\SpinUp;
use App\AmorphousFabric\TemplateLibrary;
use App\CognitiveFabric\CognitiveFabric;
use App\Decision\LiveRasterizer;
use App\Decision\QuantizedSwingDecision;
use App\Decision\RatioEngine;
use App\Escalation\EscalationGate;
use App\Fallback\CircuitBreaker;
use App\Fallback\ProviderChain;
use App\MorphicMemory\MorphicMemoryRegion;
use App\Router\LocalRouter;
use App\SealedVault\SealedVault;
use App\Supervisor\Allowlist;
use App\Supervisor\Constitution;
use App\Supervisor\Containment;
use App\Supervisor\Kernel;
use App\Supervisor\SupervisorAgent;
use App\Tools\ToolCatalog;

/**
 * Binds each document domain. Compatible with Illuminate\Support\ServiceProvider::register().
 */
class Rootv2ServiceProvider
{
    public function register(): array
    {
        $config = require dirname(__DIR__, 2).'/config/rootv2.php';
        $dataDir = $config['data_dir'];

        return [
            Constitution::class => new Constitution($config['constitution_version']),
            Allowlist::class => Allowlist::empty(),
            Containment::class => new Containment(),
            RatioEngine::class => new RatioEngine(
                $config['decision']['contain_threshold'],
                $config['decision']['escalate_threshold'],
            ),
            LiveRasterizer::class => new LiveRasterizer(),
            QuantizedSwingDecision::class => new QuantizedSwingDecision($config['decision']['hysteresis']),
            MorphicMemoryRegion::class => new MorphicMemoryRegion(),
            CognitiveFabric::class => CognitiveFabric::baseline(),
            Pricing::class => new Pricing($config['amorphous']['markup'], $config['amorphous']['floor_usd'], $config['amorphous']['min_margin']),
            AwsSynthesizer::class => new AwsSynthesizer(new TemplateLibrary()),
            SpinUp::class => new SpinUp($config['amorphous']['free_ttl_hours']),
            CostGuard::class => new CostGuard(),
            DecentralPolicy::class => DecentralPolicy::localOnly(),
            InteractionLogger::class => new InteractionLogger($dataDir),
            WireLogger::class => new WireLogger($dataDir),
            EmbeddingIndex::class => new EmbeddingIndex(),
            SealedVault::class => new SealedVault($config['identity_key']),
            LocalRouter::class => new LocalRouter(),
            ToolCatalog::class => new ToolCatalog(),
            CircuitBreaker::class => new CircuitBreaker(),
            ProviderChain::class => new ProviderChain(),
            EscalationGate::class => new EscalationGate(
                $config['escalation']['auto_response_ratio'],
                $config['escalation']['escalation_threshold'],
            ),
            SupervisorAgent::class => SupervisorAgent::default($dataDir, $config),
            Kernel::class => Kernel::boot($dataDir, $config),
        ];
    }

    public function boot(): void
    {
        DecentralPolicy::localOnly()->assertNoPublicDecentralTransfer();
    }
}

<?php

declare(strict_types=1);

namespace App\Supervisor;

use App\AgentQuery\DecentralPolicy;
use App\AgentQuery\EmbeddingIndex;
use App\AgentQuery\InteractionLogger;
use App\AgentQuery\QueryRouter;
use App\AgentQuery\WireLogger;
use App\AmorphousFabric\AwsSynthesizer;
use App\AmorphousFabric\CostGuard;
use App\AmorphousFabric\DeclarativeSpec;
use App\AmorphousFabric\Pricing;
use App\AmorphousFabric\SpinUp;
use App\CognitiveFabric\CognitiveFabric;
use App\CognitiveFabric\PlacementPolicy;
use App\CognitiveFabric\Thought as FabricThought;
use App\Decision\LiveRasterizer;
use App\Decision\QuantizedSwingDecision;
use App\Escalation\EscalationGate;
use App\Fallback\ProviderChain;
use App\Memory\MemoryStore;
use App\MorphicMemory\MorphicMemoryRegion;
use App\Router\LocalRouter;
use App\SealedVault\SealedVault;
use App\Thought\ThoughtLoop;
use App\Tools\ToolCatalog;

/**
 * Laravel-side application kernel. Runs the upgrade-brief pipeline and
 * records into every document domain (morphic, fabric, agent query, memory).
 */
final class Kernel
{
    public function __construct(
        public readonly Persona $persona,
        public readonly Constitution $constitution,
        public readonly LocalRouter $router,
        public readonly ToolCatalog $tools,
        public readonly LiveRasterizer $raster,
        public readonly QuantizedSwingDecision $swing,
        public readonly EscalationGate $escalation,
        public readonly Containment $containment,
        public readonly Allowlist $allowlist,
        public readonly AuditLog $audit,
        public readonly IdentityVault $identity,
        public readonly Sandbox $sandbox,
        public readonly MorphicMemoryRegion $morphic,
        public readonly CognitiveFabric $fabric,
        public readonly PlacementPolicy $placement,
        public readonly MemoryStore $memory,
        public readonly InteractionLogger $interactions,
        public readonly WireLogger $wire,
        public readonly QueryRouter $query,
        public readonly EmbeddingIndex $index,
        public readonly ProviderChain $providers,
        public readonly Pricing $pricing,
        public readonly AwsSynthesizer $synthesizer,
        public readonly SpinUp $spinUp,
        public readonly CostGuard $costGuard,
        public readonly string $dataDir,
    ) {
        $this->persona->assertValid();
        DecentralPolicy::localOnly()->assertNoPublicDecentralTransfer();
    }

    public static function boot(?string $dataDir = null, array $config = []): self
    {
        $config = $config ?: (require dirname(__DIR__, 2).'/config/rootv2.php');
        $dir = $dataDir ?: (string) $config['data_dir'];
        if (! is_dir($dir)) {
            mkdir($dir, 0777, true);
        }
        $audit = new AuditLog($dir);
        $index = new EmbeddingIndex();
        $interactions = new InteractionLogger($dir);

        return new self(
            new Persona(),
            new Constitution($config['constitution_version'] ?? '1.0.0'),
            new LocalRouter(),
            new ToolCatalog(),
            new LiveRasterizer(),
            new QuantizedSwingDecision((float) ($config['decision']['hysteresis'] ?? 0.15)),
            new EscalationGate(
                (float) ($config['escalation']['auto_response_ratio'] ?? 80),
                (float) ($config['escalation']['escalation_threshold'] ?? 0.92),
            ),
            new Containment(),
            Allowlist::empty(),
            $audit,
            new IdentityVault(new SealedVault($config['identity_key'] ?? 'dev-only-passphrase'), $audit),
            new Sandbox($dir),
            new MorphicMemoryRegion(),
            CognitiveFabric::baseline(),
            new PlacementPolicy(),
            new MemoryStore(),
            $interactions,
            new WireLogger($dir),
            new QueryRouter($index, $interactions),
            $index,
            new ProviderChain(),
            new Pricing(
                (float) ($config['amorphous']['markup'] ?? 1.25),
                (float) ($config['amorphous']['floor_usd'] ?? 29),
                (float) ($config['amorphous']['min_margin'] ?? 0.15),
            ),
            new AwsSynthesizer(),
            new SpinUp((int) ($config['amorphous']['free_ttl_hours'] ?? 4)),
            new CostGuard(),
            $dir,
        );
    }

    public function decide(string $text): array
    {
        $route = $this->router->route($text);
        $this->wire->log('router.route', ['text' => $text], ['toolId' => $route['toolId'], 'confidence' => $route['confidence']]);
        $gate = $this->constitution->evaluate($text, false, $route['intentHint']);
        $this->audit->append(['kind' => 'constitution_decision', 'allowed' => $gate['allowed'], 'intent' => $gate['intent'], 'reason' => $gate['reason']]);
        $this->wire->log('constitution.gate', ['text' => $text], ['allowed' => $gate['allowed'], 'intent' => $gate['intent']]);

        $ratio = $this->raster->snapshot();
        $plan = ThoughtLoop::run([
            'text' => $text,
            'threatSafeRatio' => $ratio['threatSafeRatio'],
            'constitutionAllowed' => $gate['allowed'],
        ]);

        $this->routeThoughtOnFabric($text, $plan, $gate['allowed'] ? 3.0 : 9.0);

        if (! $gate['allowed']) {
            return [
                'ok' => false,
                'routedTool' => $route['toolId'],
                'constitutionAllowed' => false,
                'constitutionReason' => $gate['reason'],
                'escalated' => false,
                'plan' => $plan,
                'tool' => null,
            ];
        }

        $esc = $this->escalation->evaluate([
            'urgency' => 1 - $route['confidence'],
            'proposedAction' => $plan['action'],
        ]);
        $this->audit->append(['kind' => 'escalation', 'reason' => $esc['reason'], 'autoAct' => $esc['autoAct'], 'escalateToOwner' => $esc['escalateToOwner']]);

        if ($esc['escalateToOwner'] && ! $esc['autoAct'] && $plan['action'] === 'contain') {
            return [
                'ok' => true,
                'routedTool' => $route['toolId'],
                'constitutionAllowed' => true,
                'constitutionReason' => $gate['reason'],
                'escalated' => true,
                'plan' => $plan,
                'tool' => null,
                'escalation' => $esc,
            ];
        }

        $tool = $this->tools->execute($route['toolId'], $text);
        if ($route['toolId'] === 'sandbox_rehearsal') {
            $tool['sandbox'] = $this->sandbox->rehearse($text, []);
        }
        $this->wire->log('tool.'.$route['toolId'], ['text' => $text], ['ok' => $tool['ok'], 'usedStub' => $tool['usedStub'] ?? true]);

        $interaction = $this->interactions->addEntry([
            'topic' => substr($text, 0, 80),
            'request' => $text,
            'bestAnswer' => $plan['reasoning'],
            'apiUsed' => $route['toolId'],
            'rating' => $route['confidence'],
            'tags' => ['decide', $route['toolId']],
        ]);
        $this->index->upsert($interaction['uuid'], $text.' '.$plan['reasoning']);
        $this->morphic->store('lesson/'.$interaction['uuid'], [
            'title' => 'Decision: '.$route['toolId'],
            'summary' => $plan['reasoning'],
            'rating' => $route['confidence'],
            'decisionRatio' => $ratio['threatSafeRatio'],
        ]);
        $this->memory->ingest([
            'kind' => 'decision',
            'outcome' => $tool['ok'] ? 'success' : 'failure',
            'detail' => $route['toolId'].' '.$text,
        ]);

        return [
            'ok' => true,
            'routedTool' => $route['toolId'],
            'constitutionAllowed' => true,
            'constitutionReason' => $gate['reason'],
            'escalated' => $esc['escalateToOwner'],
            'plan' => $plan,
            'tool' => $tool,
            'escalation' => $esc,
            'interactionUuid' => $interaction['uuid'],
            'layout' => $this->morphic->layout(),
            'hubHeap' => $this->fabric->hubHeapSize(),
        ];
    }

    public function observe(array $hits, string $sessionId = 'session', array $candidate = []): array
    {
        if ($candidate !== [] && ! $this->allowlist->isAllowlisted($candidate)) {
            $this->audit->append(['kind' => 'observe_ignored', 'reason' => 'not on allowlist', 'sessionId' => $sessionId]);

            return ['action' => 'ignored', 'reason' => 'Non-allowlisted session is not watched.'];
        }
        $this->raster->ingestHits($hits);
        $ratio = $this->raster->snapshot();
        $level = $this->swing->decide($ratio['threatSafeRatio']);
        $this->audit->append(['kind' => 'observe', 'ratio' => $ratio, 'swing' => $level]);
        $this->wire->log('observe.ratio', ['sessionId' => $sessionId], $ratio);

        if ($level['action'] !== 'contain') {
            return ['action' => $level['action'], 'ratio' => $ratio, 'swing' => $level];
        }

        $gate = $this->constitution->evaluate('contain the session', false, 'contain_session');
        if (! $gate['allowed']) {
            return ['action' => 'hold', 'reason' => $gate['reason'], 'ratio' => $ratio];
        }
        $contained = $this->containment->contain($sessionId);
        $this->morphic->store('incident/'.$sessionId, $contained);
        $this->memory->ingest([
            'kind' => 'incident',
            'outcome' => 'success',
            'detail' => 'contained '.$sessionId.' '.$level['label'],
        ]);

        return $contained + ['ratio' => $ratio, 'swing' => $level];
    }

    public function status(): array
    {
        return [
            'app' => 'agent',
            'persona' => $this->persona->mode,
            'tenureYearsEquivalent' => $this->persona->tenureYearsEquivalent,
            'dataDir' => $this->dataDir,
            'audit' => count($this->audit->all()),
            'memory' => count($this->memory->all()),
            'interactions' => count($this->interactions->all()),
            'layout' => $this->morphic->layout(),
            'fabricCores' => $this->fabric->grid->size(),
            'hubHeap' => $this->fabric->hubHeapSize(),
            'pricingFloor' => $this->pricing->quote(0)['bill'],
            'decentral' => DecentralPolicy::localOnly(),
            'identityUnsupported' => IdentityVault::unsupportedApis(),
        ];
    }

    public function spin(array $spec, bool $paid = false): array
    {
        $decl = DeclarativeSpec::fromArray($spec);
        $plan = $this->synthesizer->synthesise($decl);
        $guard = $this->costGuard->inspect($plan['estimated_aws_usd'], $plan['estimated_aws_usd']);
        if ($guard['frozen']) {
            return ['ok' => false, 'guard' => $guard];
        }
        $quote = $this->pricing->quote($plan['estimated_aws_usd']);
        $env = $this->spinUp->spin($decl, $plan, $paid);

        return ['ok' => true, 'quote' => $quote, 'environment' => $env];
    }

    private function routeThoughtOnFabric(string $text, array $plan, float $priority): void
    {
        $thought = new FabricThought(bin2hex(random_bytes(4)), $text.' → '.$plan['action'], $priority, 17);
        $core = $this->placement->place($this->fabric, $thought);
        $this->fabric->inject($core, $thought);
        if ($core !== 0) {
            $this->fabric->stepTowardHub($core);
        }
    }
}

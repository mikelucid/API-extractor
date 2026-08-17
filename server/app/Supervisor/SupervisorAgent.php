<?php

declare(strict_types=1);

namespace App\Supervisor;

use App\Decision\LiveRasterizer;
use App\Decision\QuantizedSwingDecision;
use App\Escalation\EscalationGate;
use App\Router\LocalRouter;
use App\SealedVault\SealedVault;
use App\Thought\LightweightCritic;
use App\Thought\ThoughtLoop;
use App\Tools\ToolCatalog;

final class SupervisorAgent
{
    public function __construct(
        public readonly Constitution $constitution,
        public readonly LocalRouter $router,
        public readonly ToolCatalog $tools,
        public readonly LiveRasterizer $raster,
        public readonly QuantizedSwingDecision $swing,
        public readonly EscalationGate $escalation,
        public readonly Containment $containment,
        public readonly AuditLog $audit,
        public readonly Allowlist $allowlist,
        public readonly IdentityVault $identity,
    ) {
    }

    public static function default(string $dataDir, array $config): self
    {
        $audit = new AuditLog();

        return new self(
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
            $audit,
            Allowlist::empty(),
            new IdentityVault(new SealedVault($config['identity_key'] ?? 'dev-only-passphrase'), $audit),
        );
    }

    public function decide(string $text): array
    {
        $route = $this->router->route($text);
        $gate = $this->constitution->evaluate($text, false, $route['intentHint']);
        $this->audit->append(['kind' => 'gate', 'text' => $text, 'allowed' => $gate['allowed'], 'intent' => $gate['intent']]);
        if (! $gate['allowed']) {
            return ['ok' => false, 'gate' => $gate, 'route' => $route, 'tool' => null];
        }
        $ratio = $this->raster->snapshot();
        $plan = ThoughtLoop::thinkInitial([
            'text' => $text,
            'threatSafeRatio' => $ratio['threatSafeRatio'],
            'constitutionAllowed' => true,
        ]);
        $plan = ThoughtLoop::refinePlan($plan, new LightweightCritic());
        $esc = $this->escalation->evaluate([
            'urgency' => $ratio['confidence'],
            'proposedAction' => $plan['action'],
        ]);
        $tool = $this->tools->execute($route['toolId'], $text);

        return [
            'ok' => true,
            'gate' => $gate,
            'route' => $route,
            'ratio' => $ratio,
            'plan' => $plan,
            'escalation' => $esc,
            'tool' => $tool,
        ];
    }

    public function observe(array $hits, string $sessionId = 'session'): array
    {
        $this->raster->ingestHits($hits);
        $ratio = $this->raster->snapshot();
        $level = $this->swing->decide($ratio['threatSafeRatio']);
        $this->audit->append(['kind' => 'observe', 'ratio' => $ratio, 'swing' => $level]);
        if ($level['action'] === 'contain') {
            return $this->containment->contain($sessionId);
        }

        return ['action' => $level['action'], 'ratio' => $ratio, 'swing' => $level];
    }
}

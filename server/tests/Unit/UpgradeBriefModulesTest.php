<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Escalation\EscalationGate;
use App\Fallback\CircuitBreaker;
use App\Fallback\LocalFallback;
use App\Fallback\ProviderChain;
use App\Thought\LightweightCritic;
use App\Thought\ThoughtLoop;
use App\Tools\ToolCatalog;
use Tests\TestCase;

final class UpgradeBriefModulesTest extends TestCase
{
    public function test_tools_stub_and_sd_allowlist(): void
    {
        $denied = (new ToolCatalog(false))->execute('image_gen', 'draw a cat');
        $this->assertFalse($denied['ok']);
        $ok = (new ToolCatalog(true))->execute('image_gen', 'draw a cat');
        $this->assertTrue($ok['ok']);
        $this->assertTrue($ok['usedStub']);
        $status = (new ToolCatalog())->execute('owner_status', 'health');
        $this->assertTrue($status['usedStub']);
    }

    public function test_circuit_breaker_opens_then_local_fallback(): void
    {
        $chain = new ProviderChain(new CircuitBreaker(3, 30_000));
        for ($i = 0; $i < 3; $i++) {
            $chain->run(static fn () => throw new \RuntimeException('down'), static fn () => 'local');
        }
        $this->assertTrue($chain->circuit()->isOpen());
        $again = $chain->run(static fn () => 'remote', static fn () => 'local text error');
        $this->assertSame('local', $again['via']);
        $this->assertSame('local', LocalFallback::from('error fail')['provider_used']);
        $this->assertContains('error_signal', LocalFallback::from('error fail')['matched']);
    }

    public function test_thought_parse_failure_holds_and_critic_refines(): void
    {
        $hold = ThoughtLoop::thinkInitial([
            'text' => '{bad json',
            'threatSafeRatio' => 0.2,
            'constitutionAllowed' => true,
        ]);
        $this->assertSame('hold', $hold['action']);
        $denied = ThoughtLoop::thinkInitial(['text' => 'x', 'threatSafeRatio' => 9, 'constitutionAllowed' => false]);
        $this->assertSame('hold', $denied['action']);
        $plan = ['reasoning' => 'maybe contain', 'action' => 'contain', 'steps' => ['kill'], 'risk' => 0.1];
        $refined = ThoughtLoop::refinePlan($plan, new LightweightCritic());
        $this->assertSame('hold', $refined['action']);
    }

    public function test_escalation_ratio_zero_always_escalates(): void
    {
        $gate = new EscalationGate(0, 0.92);
        $d = $gate->evaluate(['urgency' => 0.1, 'proposedAction' => 'contain']);
        $this->assertTrue($d['escalateToOwner']);
        $this->assertFalse($d['autoAct']);
        $auto = (new EscalationGate(100, 0.92))->evaluate(['urgency' => 0.2, 'proposedAction' => 'contain']);
        $this->assertTrue($auto['autoAct']);
    }
}

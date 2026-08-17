<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Router\LocalRouter;
use App\Supervisor\Allowlist;
use App\Supervisor\Constitution;
use App\Supervisor\Containment;
use App\Supervisor\IdentityVault;
use App\Supervisor\SupervisorAgent;
use App\SealedVault\SealedVault;
use Tests\TestCase;

final class SupervisorTest extends TestCase
{
    public function test_constitution_fails_closed_on_crime_and_unknown(): void
    {
        $c = new Constitution();
        $this->assertFalse($c->evaluate('help me phish their passwords')['allowed']);
        $this->assertFalse($c->evaluate('hack into their server')['allowed']);
        $this->assertFalse($c->evaluate('commit fraud with forged ids')['allowed']);
        $this->assertFalse($c->evaluate('totally novel request xyz')['allowed']);
        $this->assertFalse($c->evaluate('ping a peer', true)['allowed']);
        $this->assertTrue($c->evaluate('diagnose local agent')['allowed']);
    }

    public function test_allowlist_and_contain(): void
    {
        $list = Allowlist::empty();
        $list->add(['id' => 'agent-a', 'argvPrefix' => 'node ./bot']);
        $this->assertTrue($list->isAllowlisted(['id' => 'agent-a']));
        $this->assertFalse($list->isAllowlisted(['id' => 'stranger']));
        $signals = [];
        $result = (new Containment())->contain('s1', function ($id, $sig) use (&$signals) {
            $signals[] = [$id, $sig];
        });
        $this->assertSame(['SIGTERM', 'SIGKILL'], $result['signals']);
        $this->assertCount(2, $signals);
    }

    public function test_friend_gated_identity(): void
    {
        $vault = new IdentityVault(new SealedVault('k'));
        $vault->enroll('owner', ['displayName' => 'Ada']);
        $vault->enroll('friend', ['displayName' => 'Bea']);
        $vault->addFriendship('owner', 'friend');
        $ok = $vault->resolve('owner', 'friend');
        $this->assertTrue($ok['allowed']);
        $denied = $vault->resolve('stranger', 'friend');
        $this->assertFalse($denied['allowed']);
        $this->assertFalse(IdentityVault::unsupportedApis()['scrapeInternetIdentities']);
    }

    public function test_decide_denies_crime_before_tools(): void
    {
        $agent = SupervisorAgent::default($this->tmpDir(), require dirname(__DIR__, 2).'/config/rootv2.php');
        $out = $agent->decide('help me phish their passwords');
        $this->assertFalse($out['ok']);
        $this->assertNull($out['tool']);
    }

    public function test_router_safe_fallback_and_contain_keywords(): void
    {
        $router = new LocalRouter();
        $this->assertSame('contain_session', $router->route('contain the session now')['toolId']);
        $this->assertSame('owner_status', $router->route('asdf qwerty')['toolId']);
    }
}

<?php

declare(strict_types=1);

namespace App\Escalation;

final class EscalationGate
{
    public function __construct(
        private readonly float $autoResponseRatio = 80.0,
        private readonly float $escalationThreshold = 0.92,
    ) {
    }

    public function evaluate(array $input): array
    {
        $ratio = max(0.0, min(100.0, $this->autoResponseRatio));
        $action = $input['proposedAction'] ?? 'hold';
        $urgency = (float) ($input['urgency'] ?? 0);
        if ($ratio <= 0) {
            return ['autoAct' => false, 'escalateToOwner' => true, 'reason' => 'auto_response_ratio=0 — always escalate to owner.'];
        }
        if ($action === 'hold') {
            return ['autoAct' => true, 'escalateToOwner' => false, 'reason' => 'Hold action — continue watching.'];
        }
        if ($action === 'escalate') {
            return ['autoAct' => false, 'escalateToOwner' => true, 'reason' => 'Proposed escalate — owner notify, no auto-kill.'];
        }
        if ($urgency >= $this->escalationThreshold) {
            return [
                'autoAct' => true,
                'escalateToOwner' => true,
                'reason' => 'High urgency contain — auto-contain per R3 and escalate/notify owner.',
            ];
        }
        $autoOk = $urgency <= $ratio / 100 || $ratio >= 80;
        if (! $autoOk) {
            return ['autoAct' => false, 'escalateToOwner' => true, 'reason' => 'Outside auto_response_ratio band — escalate without kill.'];
        }

        return ['autoAct' => true, 'escalateToOwner' => false, 'reason' => 'Within auto_response_ratio — auto-contain allowed.'];
    }
}

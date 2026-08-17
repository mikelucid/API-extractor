<?php

declare(strict_types=1);

namespace App\Fallback;

final class ProviderChain
{
    public function __construct(private readonly CircuitBreaker $breaker = new CircuitBreaker())
    {
    }

    public function run(callable $remote, callable $local): array
    {
        if ($this->breaker->isOpen()) {
            return ['value' => LocalFallback::from((string) $local()), 'via' => 'local'];
        }
        try {
            $value = $remote();
            $this->breaker->recordSuccess();

            return ['value' => $value, 'via' => 'remote'];
        } catch (\Throwable) {
            $this->breaker->recordFailure();

            return ['value' => LocalFallback::from('error'), 'via' => 'local'];
        }
    }

    public function circuit(): CircuitBreaker
    {
        return $this->breaker;
    }
}

<?php

declare(strict_types=1);

namespace App\CognitiveFabric;

/**
 * Processing unit with 6 peripheral ports + 1 central port.
 */
class Core
{
    /** @var array<string, Port> */
    public array $ports = [];

    /** @var list<Thought> */
    public array $heap = [];

    /** @var array<int, array{port:string,core:int}> */
    public array $routingTable = [];

    public function __construct(
        public readonly int $id,
        public readonly bool $centralPortAvailable = true,
    ) {
        for ($i = 0; $i < 6; $i++) {
            $this->ports['P'.$i] = new Port('P'.$i);
        }
        $this->ports[Port::CENTRAL] = new Port(Port::CENTRAL);
    }

    public function receive(Thought $thought): void
    {
        $thought->decay();
        $this->heap[] = $thought;
        usort($this->heap, static fn (Thought $a, Thought $b) => $b->priority <=> $a->priority);
    }

    public function popHighest(): ?Thought
    {
        return array_shift($this->heap);
    }
}

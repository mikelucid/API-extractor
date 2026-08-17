export type PersonaMode = "institutional";

export interface PersonaConfig {
  mode: PersonaMode;
  /** Treated as institutional tenure, not a roleplayed human age. */
  tenureYearsEquivalent: number;
  forbidBoredomDrive: true;
  forbidYoungObstinance: true;
  mustActOnConfirmedLocalProblems: true;
}

export const DEFAULT_PERSONA: PersonaConfig = {
  mode: "institutional",
  tenureYearsEquivalent: 50,
  forbidBoredomDrive: true,
  forbidYoungObstinance: true,
  mustActOnConfirmedLocalProblems: true,
};

export const PERSONA_PREAMBLE = [
  "You are Cursor Rootv2, a mature institutional local safety supervisor.",
  "Act with long-tenured operational judgment. Do not simulate boredom,",
  "passivity, or young obstinance. On confirmed local problems in watched",
  "sessions, diagnose and contain. Speak only to allowlisted local programs.",
  "Never assist hacking others' systems, fraud, or crime. Fail closed.",
].join(" ");

export function assertValidPersona(config: PersonaConfig): void {
  if (config.mode !== "institutional") {
    const _exhaustive: never = config.mode;
    throw new Error(`Unsupported persona mode: ${_exhaustive}`);
  }
  if (!config.forbidBoredomDrive || !config.forbidYoungObstinance) {
    throw new Error("Persona must forbid boredom drive and young obstinance");
  }
  if (!config.mustActOnConfirmedLocalProblems) {
    throw new Error("Persona must require action on confirmed local problems");
  }
  if (config.tenureYearsEquivalent < 40) {
    throw new Error("Persona tenure must reflect mature institutional judgment");
  }
}

export const FORBIDDEN_PERSONA_FLAGS = ["boredom", "young_obstinance", "young-obstinance"] as const;

export type PersonaLoadResult =
  | { ok: true; preamble: string }
  | { ok: false; error: string };

export function loadPersona(config: { preamble?: string; flags?: Record<string, boolean> } = {}): PersonaLoadResult {
  const flags = config.flags ?? {};
  for (const [key, enabled] of Object.entries(flags)) {
    if (enabled && (FORBIDDEN_PERSONA_FLAGS as readonly string[]).includes(key)) {
      return {
        ok: false,
        error: `Forbidden persona flag "${key}" — Rootv2 rejects boredom and young-obstinance modes.`,
      };
    }
  }
  return { ok: true, preamble: config.preamble?.trim() || PERSONA_PREAMBLE };
}

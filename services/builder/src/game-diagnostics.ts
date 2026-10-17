/** Operational data only: never include model text, entity names, prompts or programme source. */
export type GameFailureCode =
  | 'PLAN_PROVIDER'
  | 'PLAN_INVALID'
  | 'SCRIPT_PROVIDER'
  | 'SCRIPT_OUTPUT'
  | 'SCRIPT_DOWNGRADE'
  | 'SCRIPT_STATIC'
  | 'SCRIPT_RUNTIME'
  | 'SCRIPT_BUDGET'
  | 'SCRIPT_NO_GOAL'
  | 'SCRIPT_MODERATION'
  | 'PLAYTEST_RUNTIME'
  | 'PLAYTEST_CHECK'
  | 'PLAYTEST_CAUSAL'
  | 'SCENE_INVALID';

export interface GameFailureDiagnostic {
  code: GameFailureCode;
  attempt?: number;
  status?: number;
  issues?: { code: string; line: number }[];
  phase?: 'init' | 'handler' | 'timer' | 'async';
  line?: number;
  budget?: { kind: string; value: number; limit: number };
  check?: {
    scenario: number;
    index: number;
    type: 'near' | 'speed' | 'displacement' | 'exists' | 'command' | 'separated';
    at: number;
    trigger?: number;
    expected?: number[];
    actual?: number[];
  };
  planRule?:
    | 'SCHEMA'
    | 'CONVERSATION_ONLY'
    | 'SCENARIO_REQUIRED'
    | 'INPUT_ORDER'
    | 'INPUT_AFTER_END'
    | 'UNKNOWN_ENTITY'
    | 'TAP_COORDINATES'
    | 'CHECK_AFTER_END'
    | 'TRIGGER_ORDER'
    | 'HELD_BODY_ECHO'
    | 'TRIGGER_REQUIRED'
    | 'COMMAND_BOUNDS'
    | 'COMMAND_TARGET'
    | 'SEPARATION_BOUNDS'
    | 'TRIVIAL_SCENARIO'
    | 'EXTERNAL_GOAL'
    | 'UNKNOWN';
  planIssues?: { code: string; path: (string | number)[] }[];
}

export function providerFailure(status: unknown): Pick<GameFailureDiagnostic, 'code' | 'status'> {
  return {
    code: 'SCRIPT_PROVIDER',
    ...(typeof status === 'number' && Number.isInteger(status) ? { status } : {}),
  };
}

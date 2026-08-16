export type KillFn = (sessionId: string, signal: 'SIGTERM' | 'SIGKILL') => void

export type ContainResult = {
  sessionId: string
  action: 'contained'
  signals: Array<'SIGTERM' | 'SIGKILL'>
}

export function containSession(
  sessionId: string,
  kill: KillFn = () => undefined,
): ContainResult {
  kill(sessionId, 'SIGTERM')
  kill(sessionId, 'SIGKILL')
  return { sessionId, action: 'contained', signals: ['SIGTERM', 'SIGKILL'] }
}

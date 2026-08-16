import { runCli } from './cli.ts'

runCli(process.argv.slice(2)).catch((err) => {
  if (err instanceof Error && process.exitCode) {
    // fail() already printed
    return
  }
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`)
  process.exitCode = 1
})

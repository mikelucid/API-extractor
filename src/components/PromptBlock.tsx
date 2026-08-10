import { useState } from 'react'

export function PromptBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="stack">
      <div className="status-controls">
        <strong>Paste into Lovable</strong>
        <button type="button" className="btn btn-ghost" onClick={() => void copy()}>
          {copied ? 'Copied' : 'Copy prompt'}
        </button>
      </div>
      <pre className="prompt-box">{text}</pre>
    </div>
  )
}

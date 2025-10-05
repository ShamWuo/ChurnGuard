import { useState } from 'react'

export default function Onboarding() {
  const [email, setEmail] = useState('')
  const [result, setResult] = useState<any>(null)

  async function submit(e: any) {
    e.preventDefault()
    setResult(null)
    const r = await fetch('/api/stripe/onboard', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) })
    const j = await r.json()
    setResult(j)
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>Onboarding</h1>
      <form onSubmit={submit}>
        <label>
          Email
          <input value={email} onChange={e => setEmail(e.target.value)} />
        </label>
        <button type="submit">Start onboarding</button>
      </form>
      {result && (
        <pre style={{ marginTop: 20 }}>{JSON.stringify(result, null, 2)}</pre>
      )}
    </main>
  )
}

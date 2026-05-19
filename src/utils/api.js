import { Capacitor } from '@capacitor/core'

const API_BASE = Capacitor.isNativePlatform() ? 'https://dona-rosa.vercel.app' : ''

export async function* streamChat({ messages, system, model = 'claude-haiku-4-5', max_tokens = 512 }) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, system, model, max_tokens }),
  })

  if (!res.ok) {
    const err = new Error('connection_error')
    err.status = res.status
    throw err
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') return
      try {
        const parsed = JSON.parse(data)
        if (parsed.error) throw new Error(parsed.error)
        if (parsed.text) yield parsed.text
      } catch (e) {
        if (e.message !== 'undefined') throw e
      }
    }
  }
}

import Anthropic from '@anthropic-ai/sdk'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Server not configured' })
  }

  const { messages, system, model = 'claude-haiku-4-5', max_tokens = 512 } = req.body

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  try {
    const stream = client.messages.stream({ model, max_tokens, system, messages })

    for await (const ev of stream) {
      if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: ev.delta.text })}\n\n`)
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  }
}

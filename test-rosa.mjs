/**
 * test-rosa.mjs — prueba el chat de Rosa en la terminal
 * Uso: ANTHROPIC_API_KEY=sk-ant-... node test-rosa.mjs
 */
import Anthropic from '@anthropic-ai/sdk'

const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) {
  console.error('\n❌ Falta la clave de API.')
  console.error('   Usa: ANTHROPIC_API_KEY=sk-ant-... node test-rosa.mjs\n')
  process.exit(1)
}

const PROMPT_SISTEMA = `Eres Rosa, una asistente virtual amable y paciente para adultos mayores.
Responde con frases cortas y simples, máximo 3 oraciones.
Habla con calma y cariño. Usa palabras de aliento como "muy bien", "con gusto", "no se preocupe".`

const client = new Anthropic({ apiKey })

async function preguntarARosa(pregunta, contexto = 'pantalla principal') {
  console.log(`\n👤 Usuario: ${pregunta}`)
  process.stdout.write('🌸 Rosa:    ')

  const stream = client.messages.stream({
    model: 'claude-haiku-4-5',
    max_tokens: 512,
    system: PROMPT_SISTEMA,
    messages: [
      {
        role: 'user',
        content: `[Contexto: el usuario tocó el botón "${contexto}"]\n\n${pregunta}`,
      },
    ],
  })

  for await (const evento of stream) {
    if (evento.type === 'content_block_delta' && evento.delta.type === 'text_delta') {
      process.stdout.write(evento.delta.text)
    }
  }

  const final = await stream.finalMessage()
  console.log('\n')
  return final
}

// Pruebas
console.log('═══════════════════════════════════════')
console.log('  🌸 Test de Chat — Doña Rosa')
console.log('  Modelo: claude-haiku-4-5  |  Streaming: ✅')
console.log('═══════════════════════════════════════')

await preguntarARosa('Hola, ¿quién eres?', 'llamar familia')
await preguntarARosa('¿Cómo llamo a mi hija María?', 'llamar familia')
await preguntarARosa('Quiero pagar la luz', 'pagar servicios')
await preguntarARosa('Me duele el pecho', 'necesito ayuda')

console.log('═══════════════════════════════════════')
console.log('  ✅ Prueba completada. El streaming funciona correctamente.')
console.log('  Ingresa tu API key en ⚙️ de la app para usar el chat.')
console.log('═══════════════════════════════════════\n')

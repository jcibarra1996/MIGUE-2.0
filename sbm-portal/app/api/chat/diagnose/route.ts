// app/api/chat/diagnose/route.ts
// TEMPORAL — elimina este archivo después de diagnosticar
export const runtime = 'nodejs'
import { NextResponse } from 'next/server'

export async function GET() {
  const results: Record<string, any> = {}

  // 1. Verificar que las keys existen (sin exponerlas)
  results.gemini_key_exists = !!process.env.GEMINI_API_KEY
  results.groq_key_exists = !!process.env.GROQ_API_KEY
  results.gemini_key_length = process.env.GEMINI_API_KEY?.length || 0
  results.groq_key_length = process.env.GROQ_API_KEY?.length || 0

  // 2. Probar Gemini
  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'hola' }] }] }),
      }
    )
    results.gemini_status = geminiRes.status
    results.gemini_ok = geminiRes.ok
    if (!geminiRes.ok) {
      const err = await geminiRes.json()
      results.gemini_error = err?.error?.message || 'unknown'
    }
  } catch (e: any) {
    results.gemini_exception = e.message
  }

  // 3. Probar Groq
  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'hola' }],
        max_tokens: 10,
      }),
    })
    results.groq_status = groqRes.status
    results.groq_ok = groqRes.ok
    if (!groqRes.ok) {
      const err = await groqRes.json()
      results.groq_error = err?.error?.message || 'unknown'
    }
  } catch (e: any) {
    results.groq_exception = e.message
  }

  return NextResponse.json(results)
}

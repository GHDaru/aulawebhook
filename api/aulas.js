import { put } from '@vercel/blob'

const MAX_HTML_SIZE_BYTES = 1_500_000

function resolveOrigin(req) {
  const protocol = req.headers['x-forwarded-proto'] || 'https'
  return `${protocol}://${req.headers.host}`
}

function parseJsonBody(body) {
  if (!body) {
    return {}
  }

  if (typeof body === 'string') {
    return JSON.parse(body)
  }

  return body
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método não permitido.' })
  }

  try {
    const { filename, html } = parseJsonBody(req.body)

    if (!html || typeof html !== 'string') {
      return res.status(400).json({ error: 'Conteúdo HTML inválido.' })
    }

    const htmlSize = new TextEncoder().encode(html).length
    if (htmlSize > MAX_HTML_SIZE_BYTES) {
      return res.status(400).json({
        error: 'Arquivo HTML muito grande. Limite de 1.5 MB.',
      })
    }

    const fileName = typeof filename === 'string' ? filename.toLowerCase() : ''
    if (fileName && !fileName.endsWith('.html')) {
      return res.status(400).json({ error: 'Envie um arquivo com extensão .html.' })
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(500).json({
        error: 'Variável BLOB_READ_WRITE_TOKEN não configurada no ambiente.',
      })
    }

    const lessonId = crypto.randomUUID()
    const path = `aulas/${lessonId}.html`

    await put(path, html, {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'text/html; charset=utf-8',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    return res.status(201).json({
      id: lessonId,
      studentUrl: `${resolveOrigin(req)}/aula/${lessonId}`,
    })
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao publicar a aula.',
      details: error?.message,
    })
  }
}

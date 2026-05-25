import { head } from '@vercel/blob'

function validateLessonId(value) {
  return /^[a-f0-9-]{36}$/i.test(value)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Método não permitido.' })
  }

  const { id } = req.query
  const lessonId = Array.isArray(id) ? id[0] : id

  if (!lessonId || !validateLessonId(lessonId)) {
    return res.status(400).json({ error: 'Identificador de aula inválido.' })
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({
      error: 'Variável BLOB_READ_WRITE_TOKEN não configurada no ambiente.',
    })
  }

  try {
    const blob = await head(`aulas/${lessonId}.html`, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    const response = await fetch(blob.url)
    if (!response.ok) {
      return res.status(404).json({ error: 'Aula não encontrada.' })
    }

    const html = await response.text()

    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ id: lessonId, html })
  } catch {
    return res.status(404).json({ error: 'Aula não encontrada.' })
  }
}

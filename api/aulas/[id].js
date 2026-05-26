import { del, head } from '@vercel/blob'

function validateLessonId(value) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(value)
}

export default async function handler(req, res) {
  if (!['GET', 'DELETE'].includes(req.method)) {
    res.setHeader('Allow', 'GET, DELETE')
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
    const pathname = `aulas/${lessonId}.html`
    const blob = await head(pathname, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    if (req.method === 'DELETE') {
      await del(pathname, {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      })

      return res.status(200).json({ id: lessonId, deleted: true })
    }

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

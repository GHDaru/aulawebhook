import { initDb } from '../db.js'

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

  try {
    const sql = await initDb()

    if (req.method === 'DELETE') {
      const deleted = await sql`DELETE FROM aulas WHERE id = ${lessonId} RETURNING id`
      if (!deleted.length) {
        return res.status(404).json({ error: 'Aula não encontrada.' })
      }

      return res.status(200).json({ id: lessonId, deleted: true })
    }

    const rows = await sql`SELECT html FROM aulas WHERE id = ${lessonId} LIMIT 1`
    if (!rows.length) {
      return res.status(404).json({ error: 'Aula não encontrada.' })
    }

    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ id: lessonId, html: rows[0].html })
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao carregar a aula.',
      details: error?.message,
    })
  }
}

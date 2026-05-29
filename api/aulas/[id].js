import {
  MAX_HTML_SIZE_BYTES,
  buildStudentUrl,
  formatLessonTitle,
  parseJsonBody,
  slugify,
} from '../aulas.js'
import { initDb } from '../db.js'

const MAX_SLUG_ATTEMPTS = 100

function validateSlug(value) {
  return typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(value)
}

function resolveOrigin(req) {
  const protocol = req.headers['x-forwarded-proto'] || 'https'
  return `${protocol}://${req.headers.host}`
}

function toSingleQueryValue(value) {
  if (Array.isArray(value)) {
    return value[0]
  }
  return value
}

async function addLesson(req, res, disciplineId) {
  try {
    const { filename, html, title } = parseJsonBody(req.body)

    if (!validateSlug(disciplineId)) {
      return res.status(400).json({ error: 'Identificador de disciplina inválido.' })
    }

    if (!html || typeof html !== 'string') {
      return res.status(400).json({ error: 'Conteúdo HTML inválido.' })
    }

    const htmlSize = new TextEncoder().encode(html).length
    if (htmlSize > MAX_HTML_SIZE_BYTES) {
      return res.status(400).json({ error: 'Arquivo HTML muito grande. Limite de 1.5 MB.' })
    }

    const fileName = typeof filename === 'string' ? filename.toLowerCase() : ''
    if (fileName && !fileName.endsWith('.html')) {
      return res.status(400).json({ error: 'Envie um arquivo com extensão .html.' })
    }

    const sql = await initDb()
    const discipline = await sql`SELECT id, title FROM disciplinas WHERE id = ${disciplineId} LIMIT 1`

    if (!discipline.length) {
      return res.status(404).json({ error: 'Disciplina não encontrada.' })
    }

    const slugSource = fileName || title || 'aula'
    const baseSlug = slugify(slugSource, 'aula')
    let lessonId = baseSlug
    let suffix = 2

    while (suffix <= MAX_SLUG_ATTEMPTS) {
      const existing = await sql`SELECT 1 FROM aulas WHERE id = ${lessonId} LIMIT 1`
      if (!existing.length) {
        break
      }

      lessonId = `${baseSlug}-${suffix}`
      suffix += 1
    }

    if (suffix > MAX_SLUG_ATTEMPTS) {
      return res.status(409).json({ error: 'Não foi possível gerar um identificador único para a aula.' })
    }

    const orderRows = await sql`
      SELECT COALESCE(MAX(lesson_order), 0) AS max_order
      FROM aulas
      WHERE disciplina_id = ${disciplineId}
    `

    const lessonOrder = Number(orderRows[0]?.max_order ?? 0) + 1
    const trimmedTitle = typeof title === 'string' ? title.trim() : ''
    const lessonTitle = trimmedTitle || formatLessonTitle(baseSlug)

    await sql`
      INSERT INTO aulas (id, html, disciplina_id, lesson_order, title)
      VALUES (${lessonId}, ${html}, ${disciplineId}, ${lessonOrder}, ${lessonTitle})
    `

    return res.status(201).json({
      id: lessonId,
      slug: lessonId,
      disciplineId,
      disciplineTitle: discipline[0].title,
      title: lessonTitle,
      order: lessonOrder,
      studentUrl: buildStudentUrl(resolveOrigin(req), disciplineId, lessonId),
    })
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao incluir aula na disciplina.',
      details: error?.message,
    })
  }
}

async function getLesson(req, res, disciplineId, lessonId) {
  try {
    if (!validateSlug(disciplineId) || !validateSlug(lessonId)) {
      return res.status(400).json({ error: 'Identificador de aula inválido.' })
    }

    const sql = await initDb()

    const [discipline, lessons] = await Promise.all([
      sql`SELECT id, title FROM disciplinas WHERE id = ${disciplineId} LIMIT 1`,
      sql`
        SELECT id, html, title, lesson_order
        FROM aulas
        WHERE disciplina_id = ${disciplineId}
        ORDER BY lesson_order ASC
      `,
    ])

    if (!discipline.length) {
      return res.status(404).json({ error: 'Disciplina não encontrada.' })
    }

    if (!lessons.length) {
      return res.status(404).json({ error: 'Nenhuma aula encontrada nesta disciplina.' })
    }

    const currentIndex = lessons.findIndex((row) => row.id === lessonId)
    if (currentIndex < 0) {
      return res.status(404).json({ error: 'Aula não encontrada nesta disciplina.' })
    }

    const current = lessons[currentIndex]
    const previous = currentIndex > 0 ? lessons[currentIndex - 1] : null
    const next = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null
    const origin = resolveOrigin(req)

    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({
      discipline: {
        id: discipline[0].id,
        title: discipline[0].title,
      },
      lesson: {
        id: current.id,
        title: current.title || formatLessonTitle(current.id),
        order: current.lesson_order,
      },
      html: current.html,
      navigation: {
        index: currentIndex + 1,
        total: lessons.length,
        previousLessonId: previous?.id || null,
        nextLessonId: next?.id || null,
        previousUrl: previous ? buildStudentUrl(origin, disciplineId, previous.id) : null,
        nextUrl: next ? buildStudentUrl(origin, disciplineId, next.id) : null,
        studentUrl: buildStudentUrl(origin, disciplineId, current.id),
      },
    })
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao carregar a aula.',
      details: error?.message,
    })
  }
}

async function getLegacyLesson(req, res, lessonId) {
  try {
    if (!validateSlug(lessonId)) {
      return res.status(400).json({ error: 'Identificador de aula inválido.' })
    }

    const sql = await initDb()
    const rows = await sql`
      SELECT html
      FROM aulas
      WHERE id = ${lessonId}
        AND disciplina_id IS NULL
      LIMIT 1
    `

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

async function deleteDisciplineOrLegacy(req, res, lessonOrDisciplineId) {
  try {
    if (!validateSlug(lessonOrDisciplineId)) {
      return res.status(400).json({ error: 'Identificador inválido.' })
    }

    const sql = await initDb()

    const discipline = await sql`SELECT id FROM disciplinas WHERE id = ${lessonOrDisciplineId} LIMIT 1`
    if (discipline.length) {
      await sql`DELETE FROM aulas WHERE disciplina_id = ${lessonOrDisciplineId}`
      await sql`DELETE FROM disciplinas WHERE id = ${lessonOrDisciplineId}`
      return res.status(200).json({ id: lessonOrDisciplineId, deleted: true, type: 'discipline' })
    }

    const deleted = await sql`
      DELETE FROM aulas
      WHERE id = ${lessonOrDisciplineId}
        AND disciplina_id IS NULL
      RETURNING id
    `

    if (!deleted.length) {
      return res.status(404).json({ error: 'Disciplina ou aula não encontrada.' })
    }

    return res.status(200).json({ id: lessonOrDisciplineId, deleted: true, type: 'legacy-lesson' })
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao remover o conteúdo.',
      details: error?.message,
    })
  }
}

export default async function handler(req, res) {
  const id = toSingleQueryValue(req.query.id)
  const disciplineOrLegacyId = typeof id === 'string' ? id : ''

  if (!disciplineOrLegacyId) {
    return res.status(400).json({ error: 'Identificador inválido.' })
  }

  if (req.method === 'POST') {
    return addLesson(req, res, disciplineOrLegacyId)
  }

  if (req.method === 'DELETE') {
    return deleteDisciplineOrLegacy(req, res, disciplineOrLegacyId)
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST, DELETE')
    return res.status(405).json({ error: 'Método não permitido.' })
  }

  const lessonId = toSingleQueryValue(req.query.lesson)

  if (lessonId) {
    return getLesson(req, res, disciplineOrLegacyId, lessonId)
  }

  return getLegacyLesson(req, res, disciplineOrLegacyId)
}

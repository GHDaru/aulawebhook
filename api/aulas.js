import { initDb } from './db.js'
import { extractActor, validateManagerActor, validateProfessorActor } from './authz.js'

const MAX_HTML_SIZE_BYTES = 1_500_000
const MAX_SLUG_ATTEMPTS = 100

function normalizeBaseName(filename) {
  if (typeof filename !== 'string') {
    return ''
  }

  return filename.replace(/\.html?$/i, '')
}

function slugify(value, fallback) {
  const normalized = normalizeBaseName(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

  return normalized || fallback
}

function formatLessonTitle(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((segment) => {
      if (segment.toLowerCase() === 'udesc') {
        return 'UDESC'
      }

      return `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`
    })
    .join(' ')
}

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

function buildStudentUrl(origin, disciplineId, lessonId) {
  return `${origin}/student/${encodeURIComponent(disciplineId)}/${encodeURIComponent(lessonId)}`
}

async function listDisciplines(req, res) {
  try {
    const sql = await initDb()
    const origin = resolveOrigin(req)
    const actor = extractActor(req)

    if (actor.userRole === 'aluno') {
      return res.status(403).json({ error: 'Alunos não podem visualizar a gestão de disciplinas.' })
    }

    const professorError = validateProfessorActor(actor)
    if (professorError) return res.status(professorError.status).json({ error: professorError.error })

    const disciplineQuery = actor.userRole === 'professor'
      ? sql`SELECT id, title, professor_id, created_at FROM disciplinas WHERE professor_id = ${actor.userId} ORDER BY created_at DESC`
      : sql`SELECT id, title, professor_id, created_at FROM disciplinas ORDER BY created_at DESC`

    const [disciplines, rows] = await Promise.all([
      disciplineQuery,
      sql`
        SELECT id, disciplina_id, title, lesson_order, created_at
        FROM aulas
        WHERE disciplina_id IS NOT NULL
        ORDER BY disciplina_id ASC, lesson_order ASC
      `,
    ])

    const lessonsByDiscipline = new Map()

    rows.forEach((row) => {
      const items = lessonsByDiscipline.get(row.disciplina_id) || []
      items.push({
        id: row.id,
        slug: row.id,
        title: row.title || formatLessonTitle(row.id),
        order: row.lesson_order,
        studentUrl: buildStudentUrl(origin, row.disciplina_id, row.id),
        uploadedAt: row.created_at,
      })
      lessonsByDiscipline.set(row.disciplina_id, items)
    })

    const lessons = disciplines.map((discipline) => ({
      id: discipline.id,
      slug: discipline.id,
      title: discipline.title,
      professorId: discipline.professor_id || null,
      createdAt: discipline.created_at,
      lessons: lessonsByDiscipline.get(discipline.id) || [],
    }))

    return res.status(200).json({ lessons })
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao listar disciplinas publicadas.',
      details: error?.message,
    })
  }
}

async function createDiscipline(req, res) {
  try {
    const body = parseJsonBody(req.body)
    const { title } = body
    const actor = extractActor(req)
    const actorError = validateManagerActor(actor, 'Apenas professor ou admin podem cadastrar disciplinas.')
    if (actorError) return res.status(actorError.status).json({ error: actorError.error })

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({ error: 'Informe o nome da disciplina com pelo menos 3 caracteres.' })
    }

    const sql = await initDb()
    const baseSlug = slugify(title, 'disciplina')
    let disciplineId = baseSlug
    let suffix = 2

    while (suffix <= MAX_SLUG_ATTEMPTS) {
      const existing = await sql`SELECT 1 FROM disciplinas WHERE id = ${disciplineId} LIMIT 1`
      if (!existing.length) {
        break
      }

      disciplineId = `${baseSlug}-${suffix}`
      suffix += 1
    }

    if (suffix > MAX_SLUG_ATTEMPTS) {
      return res.status(409).json({ error: 'Não foi possível gerar um identificador único para a disciplina.' })
    }

    const professorId = actor.userRole === 'professor' ? actor.userId : null
    await sql`INSERT INTO disciplinas (id, title, professor_id) VALUES (${disciplineId}, ${title.trim()}, ${professorId})`

    return res.status(201).json({
      id: disciplineId,
      slug: disciplineId,
      title: title.trim(),
      professorId,
      lessons: [],
    })
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao cadastrar disciplina.',
      details: error?.message,
    })
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return listDisciplines(req, res)
  }

  if (req.method === 'POST') {
    return createDiscipline(req, res)
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Método não permitido.' })
}

export { MAX_HTML_SIZE_BYTES, parseJsonBody, slugify, formatLessonTitle, buildStudentUrl }

import { initDb } from './db.js'

const MAX_HTML_SIZE_BYTES = 1_500_000

function normalizeBaseName(filename) {
  if (typeof filename !== 'string') {
    return ''
  }

  return filename.replace(/\.html?$/i, '')
}

function slugifyLessonName(filename) {
  const normalized = normalizeBaseName(filename)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

  return normalized || 'portal-academico'
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

async function listLessons(req, res) {
  try {
    const sql = await initDb()
    const rows = await sql`SELECT id, created_at FROM aulas ORDER BY created_at DESC`
    const origin = resolveOrigin(req)

    const lessons = rows.map((row) => ({
      id: row.id,
      slug: row.id,
      title: formatLessonTitle(row.id),
      studentUrl: `${origin}/student/${row.id}`,
      uploadedAt: row.created_at,
    }))

    return res.status(200).json({ lessons })
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao listar os portais publicados.',
      details: error?.message,
    })
  }
}

async function createLesson(req, res) {
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

    const sql = await initDb()
    const baseSlug = slugifyLessonName(fileName)
    let lessonId = baseSlug
    let suffix = 2

    while (true) {
      const existing = await sql`SELECT 1 FROM aulas WHERE id = ${lessonId} LIMIT 1`
      if (!existing.length) {
        break
      }

      lessonId = `${baseSlug}-${suffix}`
      suffix += 1
    }

    await sql`INSERT INTO aulas (id, html) VALUES (${lessonId}, ${html})`

    return res.status(201).json({
      id: lessonId,
      slug: lessonId,
      title: formatLessonTitle(lessonId),
      studentUrl: `${resolveOrigin(req)}/student/${lessonId}`,
    })
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao publicar a aula.',
      details: error?.message,
    })
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return listLessons(req, res)
  }

  if (req.method === 'POST') {
    return createLesson(req, res)
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Método não permitido.' })
}

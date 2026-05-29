import { extractActor } from '../authz.js'
import {
  formatContentError,
  loadLegacyLesson,
  loadLesson,
  publishLesson,
  removeContent,
} from '../../server/content/application/use-cases.js'
import { createContentRepository } from '../../server/content/infrastructure/neon-content-repository.js'
import { parseJsonBody, resolveOrigin, toSingleQueryValue } from '../../server/content/infrastructure/http.js'

async function addLesson(req, res, disciplineId) {
  try {
    const body = parseJsonBody(req.body)
    const lesson = await publishLesson({
      disciplineId,
      filename: body.filename,
      html: body.html,
      title: body.title,
      actor: extractActor(req),
      origin: resolveOrigin(req),
      repository: await createContentRepository(),
    })

    return res.status(201).json(lesson)
  } catch (error) {
    const failure = formatContentError(error, 'Erro ao incluir aula na disciplina.')
    return res.status(failure.status).json(failure.body)
  }
}

async function getLesson(req, res, disciplineId, lessonId) {
  try {
    const payload = await loadLesson({
      disciplineId,
      lessonId,
      origin: resolveOrigin(req),
      repository: await createContentRepository(),
    })
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json(payload)
  } catch (error) {
    const failure = formatContentError(error, 'Erro ao carregar a aula.')
    return res.status(failure.status).json(failure.body)
  }
}

async function getLegacyLesson(req, res, lessonId) {
  try {
    const payload = await loadLegacyLesson({
      lessonId,
      repository: await createContentRepository(),
    })
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json(payload)
  } catch (error) {
    const failure = formatContentError(error, 'Erro ao carregar a aula.')
    return res.status(failure.status).json(failure.body)
  }
}

async function deleteDisciplineOrLegacy(req, res, lessonOrDisciplineId) {
  try {
    const payload = await removeContent({
      contentId: lessonOrDisciplineId,
      actor: extractActor(req),
      repository: await createContentRepository(),
    })
    return res.status(200).json(payload)
  } catch (error) {
    const failure = formatContentError(error, 'Erro ao remover o conteúdo.')
    return res.status(failure.status).json(failure.body)
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

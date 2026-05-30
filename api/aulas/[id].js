import { extractActor } from '../authz.js'
import {
  deleteLesson,
  formatContentError,
  loadLegacyLesson,
  loadLesson,
  publishLesson,
  reorderLesson,
  removeContent,
  updateLesson,
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
      lessonType: body.lessonType,
      videoUrl: body.videoUrl,
      actor: extractActor(req),
      origin: resolveOrigin(req),
      repository: await createContentRepository(),
    })

    return res.status(201).json(lesson)
  } catch (error) {
    const failure = formatContentError(error, 'Erro ao incluir aula no curso.')
    return res.status(failure.status).json(failure.body)
  }
}

async function editLesson(req, res, disciplineId, lessonId) {
  try {
    const body = parseJsonBody(req.body)
    const lesson = await updateLesson({
      disciplineId,
      lessonId,
      filename: body.filename,
      html: body.html,
      title: body.title,
      lessonType: body.lessonType,
      videoUrl: body.videoUrl,
      actor: extractActor(req),
      origin: resolveOrigin(req),
      repository: await createContentRepository(),
    })

    return res.status(200).json(lesson)
  } catch (error) {
    const failure = formatContentError(error, 'Erro ao atualizar a aula.')
    return res.status(failure.status).json(failure.body)
  }
}

async function moveLesson(req, res, disciplineId, lessonId) {
  try {
    const body = parseJsonBody(req.body)
    const lesson = await reorderLesson({
      disciplineId,
      lessonId,
      direction: body.direction,
      actor: extractActor(req),
      origin: resolveOrigin(req),
      repository: await createContentRepository(),
    })

    return res.status(200).json(lesson)
  } catch (error) {
    const failure = formatContentError(error, 'Erro ao reordenar a aula.')
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

async function deleteManagedLesson(req, res, disciplineId, lessonId) {
  try {
    const payload = await deleteLesson({
      disciplineId,
      lessonId,
      actor: extractActor(req),
      repository: await createContentRepository(),
    })
    return res.status(200).json(payload)
  } catch (error) {
    const failure = formatContentError(error, 'Erro ao remover a aula.')
    return res.status(failure.status).json(failure.body)
  }
}

export default async function handler(req, res) {
  const id = toSingleQueryValue(req.query.id)
  const disciplineOrLegacyId = typeof id === 'string' ? id : ''

  if (!disciplineOrLegacyId) {
    return res.status(400).json({ error: 'Identificador inválido.' })
  }

  const lessonId = toSingleQueryValue(req.query.lesson)

  if (req.method === 'POST') {
    return addLesson(req, res, disciplineOrLegacyId)
  }

  if (req.method === 'PUT') {
    if (!lessonId) {
      return res.status(400).json({ error: 'Informe a aula que será atualizada.' })
    }
    return editLesson(req, res, disciplineOrLegacyId, lessonId)
  }

  if (req.method === 'PATCH') {
    if (!lessonId) {
      return res.status(400).json({ error: 'Informe a aula que será reordenada.' })
    }
    return moveLesson(req, res, disciplineOrLegacyId, lessonId)
  }

  if (req.method === 'DELETE') {
    if (lessonId) {
      return deleteManagedLesson(req, res, disciplineOrLegacyId, lessonId)
    }
    return deleteDisciplineOrLegacy(req, res, disciplineOrLegacyId)
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST, PUT, PATCH, DELETE')
    return res.status(405).json({ error: 'Método não permitido.' })
  }

  if (lessonId) {
    return getLesson(req, res, disciplineOrLegacyId, lessonId)
  }

  return getLegacyLesson(req, res, disciplineOrLegacyId)
}

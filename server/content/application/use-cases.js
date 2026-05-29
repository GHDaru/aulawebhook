import { createDiscipline } from '../domain/discipline.js'
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../domain/errors.js'
import { createLesson, formatLessonTitle, validateHtmlContent, validateLessonFilename } from '../domain/lesson.js'
import { canManageDiscipline, ensureManagerActor, ensureViewerActor } from '../domain/permissions.js'
import { pickAvailableSlug, slugify, validateSlug } from '../domain/slug.js'
import { buildStudentUrl } from '../infrastructure/http.js'

async function listDisciplines({ actor, origin, repository }) {
  ensureViewerActor(actor)

  const disciplines = await repository.listDisciplines({
    professorId: actor.userRole === 'professor' ? actor.userId : undefined,
  })

  const lessons = await repository.listLessonsByDisciplineIds(disciplines.map((discipline) => discipline.id))
  const lessonsByDiscipline = new Map()

  lessons.forEach((lesson) => {
    const items = lessonsByDiscipline.get(lesson.disciplineId) || []
    items.push({
      id: lesson.id,
      slug: lesson.id,
      title: lesson.title || formatLessonTitle(lesson.id),
      order: lesson.order,
      studentUrl: buildStudentUrl(origin, lesson.disciplineId, lesson.id),
      uploadedAt: lesson.createdAt,
    })
    lessonsByDiscipline.set(lesson.disciplineId, items)
  })

  return {
    lessons: disciplines.map((discipline) => ({
      id: discipline.id,
      slug: discipline.id,
      title: discipline.title,
      professorId: discipline.professorId,
      createdAt: discipline.createdAt,
      lessons: lessonsByDiscipline.get(discipline.id) || [],
    })),
  }
}

async function registerDiscipline({ title, actor, repository }) {
  ensureManagerActor(actor, 'Apenas professor ou admin podem cadastrar disciplinas.')

  const baseSlug = slugify(title, 'disciplina')
  const disciplineId = pickAvailableSlug(baseSlug, await repository.listDisciplineSlugs(baseSlug))

  if (!disciplineId) {
    throw new ConflictError('Não foi possível gerar um identificador único para a disciplina.')
  }

  const discipline = createDiscipline({
    id: disciplineId,
    title,
    professorId: actor.userRole === 'professor' ? actor.userId : null,
  })

  await repository.createDiscipline(discipline)
  return discipline
}

async function publishLesson({ disciplineId, filename, html, title, actor, origin, repository }) {
  ensureManagerActor(actor, 'Apenas professor ou admin podem administrar aulas.')

  if (!validateSlug(disciplineId)) {
    throw new ValidationError('Identificador de disciplina inválido.')
  }

  validateHtmlContent(html)
  validateLessonFilename(filename)

  const discipline = await repository.findDisciplineById(disciplineId)
  if (!discipline) {
    throw new NotFoundError('Disciplina não encontrada.')
  }

  if (!canManageDiscipline(actor, discipline)) {
    throw new ForbiddenError('Você só pode administrar aulas das suas disciplinas.')
  }

  const slugSource = filename || title || 'aula'
  const baseSlug = slugify(slugSource, 'aula')
  const lessonId = pickAvailableSlug(baseSlug, await repository.listLessonSlugs(baseSlug))

  if (!lessonId) {
    throw new ConflictError('Não foi possível gerar um identificador único para a aula.')
  }

  const trimmedTitle = typeof title === 'string' ? title.trim() : ''
  const lesson = createLesson({
    id: lessonId,
    disciplineId,
    disciplineTitle: discipline.title,
    html,
    title: trimmedTitle || formatLessonTitle(baseSlug),
  })

  lesson.order = await repository.createLesson(lesson)

  return {
    id: lesson.id,
    slug: lesson.id,
    disciplineId,
    disciplineTitle: discipline.title,
    title: lesson.title,
    order: lesson.order,
    studentUrl: buildStudentUrl(origin, disciplineId, lesson.id),
  }
}

async function loadLesson({ disciplineId, lessonId, origin, repository }) {
  if (!validateSlug(disciplineId) || !validateSlug(lessonId)) {
    throw new ValidationError('Identificador de aula inválido.')
  }

  const [discipline, lessons] = await Promise.all([
    repository.findDisciplineById(disciplineId),
    repository.listLessonsByDiscipline(disciplineId),
  ])

  if (!discipline) {
    throw new NotFoundError('Disciplina não encontrada.')
  }

  if (!lessons.length) {
    throw new NotFoundError('Nenhuma aula encontrada nesta disciplina.')
  }

  const currentIndex = lessons.findIndex((lesson) => lesson.id === lessonId)
  if (currentIndex < 0) {
    throw new NotFoundError('Aula não encontrada nesta disciplina.')
  }

  const current = lessons[currentIndex]
  const previous = currentIndex > 0 ? lessons[currentIndex - 1] : null
  const next = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null

  return {
    discipline: {
      id: discipline.id,
      title: discipline.title,
    },
    lesson: {
      id: current.id,
      title: current.title || formatLessonTitle(current.id),
      order: current.order,
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
  }
}

async function loadLegacyLesson({ lessonId, repository }) {
  if (!validateSlug(lessonId)) {
    throw new ValidationError('Identificador de aula inválido.')
  }

  const lesson = await repository.findLegacyLessonById(lessonId)
  if (!lesson) {
    throw new NotFoundError('Aula não encontrada.')
  }

  return lesson
}

async function removeContent({ contentId, actor, repository }) {
  if (!validateSlug(contentId)) {
    throw new ValidationError('Identificador inválido.')
  }

  const discipline = await repository.findDisciplineById(contentId)
  if (discipline) {
    ensureManagerActor(actor, 'Apenas professor ou admin podem administrar aulas.')

    if (!canManageDiscipline(actor, discipline)) {
      throw new ForbiddenError('Você só pode administrar aulas das suas disciplinas.')
    }

    await repository.deleteDiscipline(contentId)
    return { id: contentId, deleted: true, type: 'discipline' }
  }

  const deleted = await repository.deleteLegacyLesson(contentId)
  if (!deleted) {
    throw new NotFoundError('Disciplina ou aula não encontrada.')
  }

  return { id: contentId, deleted: true, type: 'legacy-lesson' }
}

function formatContentError(error, fallbackMessage) {
  if (error?.status) {
    return {
      status: error.status,
      body: { error: error.message },
    }
  }

  return {
    status: 500,
    body: {
      error: fallbackMessage,
      details: error?.message,
    },
  }
}

export {
  formatContentError,
  listDisciplines,
  loadLegacyLesson,
  loadLesson,
  publishLesson,
  registerDiscipline,
  removeContent,
}

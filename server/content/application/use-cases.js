import { createDiscipline } from '../domain/discipline.js'
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../domain/errors.js'
import {
  createLesson,
  formatLessonTitle,
  validateHtmlContent,
  validateLessonFilename,
  validateLessonType,
  validateVideoUrl,
} from '../domain/lesson.js'
import { canManageDiscipline, ensureManagerActor, ensureViewerActor } from '../domain/permissions.js'
import { DEFAULT_DISCIPLINE_SLUG, DEFAULT_LESSON_SLUG, pickAvailableSlug, slugify, validateSlug } from '../domain/slug.js'
import { buildStudentUrl } from '../infrastructure/http.js'

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function resolveVideoEmbedUrl(videoUrl) {
  const parsedUrl = new URL(videoUrl)

  if (parsedUrl.hostname.includes('youtu.be')) {
    const videoId = parsedUrl.pathname.replaceAll('/', '')
    return videoId ? `https://www.youtube.com/embed/${encodeURIComponent(videoId)}` : videoUrl
  }

  if (parsedUrl.hostname.includes('youtube.com') && parsedUrl.searchParams.get('v')) {
    return `https://www.youtube.com/embed/${encodeURIComponent(parsedUrl.searchParams.get('v'))}`
  }

  return videoUrl
}

function buildLessonHtml(lesson) {
  if (lesson.lessonType !== 'video') {
    return lesson.html
  }

  const safeTitle = escapeHtml(lesson.title)
  const safeVideoUrl = escapeHtml(lesson.videoUrl)
  const embedUrl = escapeHtml(resolveVideoEmbedUrl(lesson.videoUrl))

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
    <style>
      body { margin: 0; font-family: Inter, Arial, sans-serif; background: #f5fbf8; color: #123524; }
      main { min-height: 100vh; display: grid; gap: 16px; place-items: center; padding: 24px; box-sizing: border-box; }
      .frame { width: min(960px, 100%); aspect-ratio: 16 / 9; border: 0; border-radius: 20px; background: #000; box-shadow: 0 24px 50px rgba(18, 53, 36, 0.18); }
      .actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
      a { color: #0d6247; font-weight: 600; }
    </style>
  </head>
  <body>
    <main>
      <iframe class="frame" src="${embedUrl}" title="${safeTitle}" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
      <div class="actions">
        <a href="${safeVideoUrl}" target="_blank" rel="noreferrer">Abrir vídeo em nova aba</a>
      </div>
    </main>
  </body>
</html>`
}

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
      lessonType: lesson.lessonType || 'html',
      videoUrl: lesson.videoUrl || null,
      studentUrl: buildStudentUrl(origin, lesson.disciplineId, lesson.id),
      uploadedAt: lesson.createdAt,
    })
    lessonsByDiscipline.set(lesson.disciplineId, items)
  })

  const courses = disciplines.map((discipline) => ({
      id: discipline.id,
      slug: discipline.id,
      title: discipline.title,
      professorId: discipline.professorId,
      createdAt: discipline.createdAt,
      lessons: lessonsByDiscipline.get(discipline.id) || [],
    }))

  return { courses, lessons: courses }
}

async function registerDiscipline({ title, actor, repository }) {
  ensureManagerActor(actor, 'Apenas professor ou admin podem cadastrar cursos.')

  const baseSlug = slugify(title, DEFAULT_DISCIPLINE_SLUG)
  const disciplineId = pickAvailableSlug(baseSlug, await repository.listDisciplineSlugs(baseSlug))

  if (!disciplineId) {
    throw new ConflictError('Não foi possível gerar um identificador único para o curso.')
  }

  const discipline = createDiscipline({
    id: disciplineId,
    title,
    professorId: actor.userRole === 'professor' ? actor.userId : null,
  })

  await repository.createDiscipline(discipline)
  return discipline
}

async function publishLesson({ disciplineId, filename, html, title, lessonType, actor, origin, repository, videoUrl }) {
  return saveLesson({
    disciplineId,
    filename,
    html,
    title,
    lessonType,
    actor,
    origin,
    repository,
    videoUrl,
  })
}

async function saveLesson({ disciplineId, lessonId = null, filename, html, title, lessonType = 'html', actor, origin, repository, videoUrl = null }) {
  ensureManagerActor(actor, 'Apenas professor ou admin podem administrar aulas.')

  if (!validateSlug(disciplineId)) {
    throw new ValidationError('Identificador de curso inválido.')
  }

  validateLessonType(lessonType)

  if (lessonType === 'html') {
    validateHtmlContent(html)
    validateLessonFilename(filename)
  } else {
    validateVideoUrl(videoUrl)
  }

  const discipline = await repository.findDisciplineById(disciplineId)
  if (!discipline) {
    throw new NotFoundError('Curso não encontrado.')
  }

  if (!canManageDiscipline(actor, discipline)) {
    throw new ForbiddenError('Você só pode administrar aulas dos seus cursos.')
  }

  const trimmedTitle = typeof title === 'string' ? title.trim() : ''
  const normalizedHtml = lessonType === 'html' ? html : ''
  const normalizedVideoUrl = lessonType === 'video' ? String(videoUrl || '').trim() : null
  let nextLessonId = lessonId

  if (!nextLessonId) {
    const slugSource = filename || title || DEFAULT_LESSON_SLUG
    const baseSlug = slugify(slugSource, DEFAULT_LESSON_SLUG)
    nextLessonId = pickAvailableSlug(baseSlug, await repository.listLessonSlugs(baseSlug))

    if (!nextLessonId) {
      throw new ConflictError('Não foi possível gerar um identificador único para a aula.')
    }
  }

  const lesson = createLesson({
    id: nextLessonId,
    disciplineId,
    disciplineTitle: discipline.title,
    html: normalizedHtml,
    lessonType,
    title: trimmedTitle || formatLessonTitle(nextLessonId),
    videoUrl: normalizedVideoUrl,
  })

  if (lessonId) {
    const updatedLesson = await repository.updateLesson({
      disciplineId,
      lessonId,
      title: lesson.title,
      html: lesson.html,
      lessonType,
      videoUrl: lesson.videoUrl,
    })

    if (!updatedLesson) {
      throw new NotFoundError('Aula não encontrada neste curso.')
    }

    lesson.order = updatedLesson.order
  } else {
    lesson.order = await repository.createLesson(lesson)
  }

  return {
    id: lesson.id,
    slug: lesson.id,
    disciplineId,
    disciplineTitle: discipline.title,
    courseId: disciplineId,
    courseTitle: discipline.title,
    title: lesson.title,
    order: lesson.order,
    lessonType,
    videoUrl: lesson.videoUrl,
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
    throw new NotFoundError('Curso não encontrado.')
  }

  if (!lessons.length) {
    throw new NotFoundError('Nenhuma aula encontrada neste curso.')
  }

  const currentIndex = lessons.findIndex((lesson) => lesson.id === lessonId)
  if (currentIndex < 0) {
    throw new NotFoundError('Aula não encontrada neste curso.')
  }

  const current = lessons[currentIndex]
  const previous = currentIndex > 0 ? lessons[currentIndex - 1] : null
  const next = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null

  return {
    course: {
      id: discipline.id,
      title: discipline.title,
    },
    discipline: {
      id: discipline.id,
      title: discipline.title,
    },
    lesson: {
      id: current.id,
      title: current.title || formatLessonTitle(current.id),
      order: current.order,
      lessonType: current.lessonType || 'html',
      videoUrl: current.videoUrl || null,
    },
    html: buildLessonHtml(current),
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
      throw new ForbiddenError('Você só pode administrar aulas dos seus cursos.')
    }

    const deleted = await repository.deleteDiscipline(contentId)
    if (!deleted) {
      throw new NotFoundError('Curso ou aula não encontrada.')
    }

    return { id: contentId, deleted: true, type: 'course' }
  }

  const deleted = await repository.deleteLegacyLesson(contentId)
  if (!deleted) {
    throw new NotFoundError('Curso ou aula não encontrada.')
  }

  return { id: contentId, deleted: true, type: 'legacy-lesson' }
}

async function updateLesson({ disciplineId, lessonId, filename, html, title, lessonType, actor, origin, repository, videoUrl }) {
  if (!validateSlug(lessonId)) {
    throw new ValidationError('Identificador de aula inválido.')
  }

  return saveLesson({
    disciplineId,
    lessonId,
    filename,
    html,
    title,
    lessonType,
    actor,
    origin,
    repository,
    videoUrl,
  })
}

async function deleteLesson({ disciplineId, lessonId, actor, repository }) {
  ensureManagerActor(actor, 'Apenas professor ou admin podem administrar aulas.')

  if (!validateSlug(disciplineId) || !validateSlug(lessonId)) {
    throw new ValidationError('Identificador de aula inválido.')
  }

  const discipline = await repository.findDisciplineById(disciplineId)
  if (!discipline) {
    throw new NotFoundError('Curso não encontrado.')
  }

  if (!canManageDiscipline(actor, discipline)) {
    throw new ForbiddenError('Você só pode administrar aulas dos seus cursos.')
  }

  const deleted = await repository.deleteLesson(disciplineId, lessonId)
  if (!deleted) {
    throw new NotFoundError('Aula não encontrada neste curso.')
  }

  return { id: lessonId, deleted: true, type: 'lesson', courseId: disciplineId }
}

async function reorderLesson({ disciplineId, lessonId, direction, actor, origin, repository }) {
  ensureManagerActor(actor, 'Apenas professor ou admin podem administrar aulas.')

  if (!validateSlug(disciplineId) || !validateSlug(lessonId)) {
    throw new ValidationError('Identificador de aula inválido.')
  }

  if (!['up', 'down'].includes(direction)) {
    throw new ValidationError('Direção de ordenação inválida.')
  }

  const discipline = await repository.findDisciplineById(disciplineId)
  if (!discipline) {
    throw new NotFoundError('Curso não encontrado.')
  }

  if (!canManageDiscipline(actor, discipline)) {
    throw new ForbiddenError('Você só pode administrar aulas dos seus cursos.')
  }

  const lesson = await repository.moveLesson({ disciplineId, lessonId, direction })
  if (!lesson) {
    throw new NotFoundError('Aula não encontrada neste curso.')
  }

  return {
    id: lesson.id,
    order: lesson.order,
    courseId: disciplineId,
    studentUrl: buildStudentUrl(origin, disciplineId, lesson.id),
  }
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
  reorderLesson,
  publishLesson,
  registerDiscipline,
  updateLesson,
  deleteLesson,
  removeContent,
}

import { ValidationError } from './errors.js'

const MAX_HTML_SIZE_BYTES = 1_500_000
const VALID_LESSON_TYPES = new Set(['html', 'video'])
const ALLOWED_VIDEO_HOSTS = ['youtube.com', 'www.youtube.com', 'youtu.be', 'vimeo.com', 'www.vimeo.com', 'player.vimeo.com']

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

function validateHtmlContent(html) {
  if (!html || typeof html !== 'string') {
    throw new ValidationError('Conteúdo HTML inválido.')
  }

  const htmlSize = new TextEncoder().encode(html).length
  if (htmlSize > MAX_HTML_SIZE_BYTES) {
    throw new ValidationError('Arquivo HTML muito grande. Limite de 1.5 MB.')
  }
}

function validateLessonType(type) {
  if (!VALID_LESSON_TYPES.has(type)) {
    throw new ValidationError('Tipo de conteúdo inválido.')
  }
}

function validateLessonFilename(filename) {
  const fileName = typeof filename === 'string' ? filename.toLowerCase() : ''
  if (fileName && !fileName.endsWith('.html')) {
    throw new ValidationError('Envie um arquivo com extensão .html.')
  }
}

function validateVideoUrl(videoUrl) {
  try {
    const parsedUrl = new URL(String(videoUrl || ''))
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new ValidationError('Informe um link de vídeo válido.')
    }
    if (!ALLOWED_VIDEO_HOSTS.some((host) => parsedUrl.hostname === host)) {
      throw new ValidationError('Use um link de vídeo do YouTube ou Vimeo.')
    }
  } catch {
    throw new ValidationError('Informe um link de vídeo válido.')
  }
}

function createLesson({ id, disciplineId, disciplineTitle, html = '', lessonType = 'html', order = null, title, videoUrl = null }) {
  return {
    id,
    slug: id,
    disciplineId,
    disciplineTitle,
    html,
    lessonType,
    order,
    title,
    videoUrl,
  }
}

export {
  MAX_HTML_SIZE_BYTES,
  VALID_LESSON_TYPES,
  createLesson,
  formatLessonTitle,
  validateHtmlContent,
  validateLessonFilename,
  validateLessonType,
  validateVideoUrl,
}

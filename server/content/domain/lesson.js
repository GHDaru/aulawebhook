import { ValidationError } from './errors.js'

const MAX_HTML_SIZE_BYTES = 1_500_000

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

function validateLessonFilename(filename) {
  const fileName = typeof filename === 'string' ? filename.toLowerCase() : ''
  if (fileName && !fileName.endsWith('.html')) {
    throw new ValidationError('Envie um arquivo com extensão .html.')
  }
}

function createLesson({ id, disciplineId, disciplineTitle, html, order = null, title }) {
  return {
    id,
    slug: id,
    disciplineId,
    disciplineTitle,
    html,
    order,
    title,
  }
}

export { MAX_HTML_SIZE_BYTES, createLesson, formatLessonTitle, validateHtmlContent, validateLessonFilename }

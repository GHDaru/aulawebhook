import { ValidationError } from './errors.js'

function createDiscipline({ id, title, professorId = null, createdAt = null }) {
  const trimmedTitle = typeof title === 'string' ? title.trim() : ''

  if (trimmedTitle.length < 3) {
    throw new ValidationError('Informe o nome do curso com pelo menos 3 caracteres.')
  }

  return {
    id,
    slug: id,
    title: trimmedTitle,
    professorId,
    createdAt,
    lessons: [],
  }
}

export { createDiscipline }

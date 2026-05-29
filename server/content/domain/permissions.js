import { ForbiddenError } from './errors.js'

function ensureViewerActor(actor) {
  if (actor.userRole === 'aluno') {
    throw new ForbiddenError('Alunos não podem visualizar a gestão de disciplinas.')
  }

  if (actor.userRole === 'professor' && !actor.userId) {
    throw new ForbiddenError('Identificação do professor é obrigatória.')
  }
}

function ensureManagerActor(actor, message) {
  if (!['admin', 'professor'].includes(actor.userRole)) {
    throw new ForbiddenError(message)
  }

  if (actor.userRole === 'professor' && !actor.userId) {
    throw new ForbiddenError('Identificação do professor é obrigatória.')
  }
}

function canManageDiscipline(actor, discipline) {
  if (actor.userRole === 'admin') return true
  return discipline.professorId === actor.userId
}

export { canManageDiscipline, ensureManagerActor, ensureViewerActor }

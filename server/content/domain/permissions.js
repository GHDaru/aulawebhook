import { ForbiddenError } from './errors.js'

function validateProfessorIdentification(actor) {
  if (actor.userRole === 'professor' && !actor.userId) {
    throw new ForbiddenError('Identificação do professor é obrigatória.')
  }
}

function ensureViewerActor(actor) {
  if (actor.userRole === 'aluno') {
    throw new ForbiddenError('Alunos não podem visualizar a gestão de cursos.')
  }

  validateProfessorIdentification(actor)
}

function ensureManagerActor(actor, message) {
  if (!['admin', 'professor'].includes(actor.userRole)) {
    throw new ForbiddenError(message)
  }

  validateProfessorIdentification(actor)
}

function canManageDiscipline(actor, discipline) {
  if (actor.userRole === 'admin') return true
  return discipline.professorId === actor.userId
}

export { canManageDiscipline, ensureManagerActor, ensureViewerActor }

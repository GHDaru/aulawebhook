const VALID_ROLES = new Set(['admin', 'professor', 'aluno'])

function normalizeRole(role) {
  if (VALID_ROLES.has(role)) return role
  return ''
}

function firstValue(value) {
  if (Array.isArray(value)) return value[0]
  return value
}

function extractActor(req) {
  const userId = String(firstValue(req.headers['x-user-id']) || '').trim()
  const userRole = normalizeRole(String(firstValue(req.headers['x-user-role']) || '').trim())
  return { userId, userRole }
}

function validateProfessorActor(actor) {
  if (actor.userRole === 'professor' && !actor.userId) {
    return { status: 401, error: 'Professor não autenticado.' }
  }

  return null
}

function validateManagerActor(actor, message) {
  if (!['admin', 'professor'].includes(actor.userRole)) {
    return { status: 403, error: message }
  }

  const professorError = validateProfessorActor(actor)
  if (professorError) return professorError

  return null
}

export { extractActor, validateProfessorActor, validateManagerActor }

import { InvalidCredentialsError, InvalidPasswordError } from '../domain/errors.js'
import { hashPassword, verifyPassword } from '../infrastructure/password-hash.js'
import { createNeonUserRepository, normalizeRole } from '../infrastructure/neon-user-repository.js'

async function authenticateUser({ identifier, password }) {
  const lookup = String(identifier || '').trim()
  const repository = await createNeonUserRepository({ hashPassword })
  const user = await repository.findByIdentifier(lookup)

  if (!user || !verifyPassword(password || '', user.senha_hash)) {
    throw new InvalidCredentialsError()
  }

  return {
    id: user.id,
    nome: user.nome,
    matricula: user.matricula,
    role: normalizeRole(user.role),
    firstAccess: Boolean(user.first_access),
  }
}

async function changeUserPassword({ userId, newPassword }) {
  if (!userId || !newPassword || String(newPassword).trim().length < 6) {
    throw new InvalidPasswordError()
  }

  const repository = await createNeonUserRepository({ hashPassword })
  await repository.updatePassword({ userId, passwordHash: hashPassword(newPassword) })
  return { changed: true }
}

async function provisionStudentIdentity({ userId, nome, matricula, defaultPassword }) {
  const repository = await createNeonUserRepository({ hashPassword })
  await repository.upsertStudentUser({
    userId,
    nome,
    matricula,
    passwordHash: hashPassword(defaultPassword),
  })
}

export { authenticateUser, changeUserPassword, provisionStudentIdentity }

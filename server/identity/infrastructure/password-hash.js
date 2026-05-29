import { Buffer } from 'node:buffer'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(String(password), salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

function verifyPassword(password, storedHash) {
  const [algorithm, salt, hash] = String(storedHash || '').split('$')
  if (algorithm !== 'scrypt' || !salt || !hash) {
    return false
  }

  const attempted = scryptSync(String(password), salt, 64).toString('hex')
  const attemptedBuffer = Buffer.from(attempted, 'hex')
  const hashBuffer = Buffer.from(hash, 'hex')

  if (attemptedBuffer.length !== hashBuffer.length) {
    return false
  }

  return timingSafeEqual(attemptedBuffer, hashBuffer)
}

export { hashPassword, verifyPassword }

class IdentityError extends Error {
  constructor(message, status) {
    super(message)
    this.name = this.constructor.name
    this.status = status
  }
}

class InvalidCredentialsError extends IdentityError {
  constructor(message = 'Credenciais inválidas.') {
    super(message, 401)
  }
}

class InvalidPasswordError extends IdentityError {
  constructor(message = 'Informe usuário e nova senha com no mínimo 6 caracteres.') {
    super(message, 400)
  }
}

export { IdentityError, InvalidCredentialsError, InvalidPasswordError }

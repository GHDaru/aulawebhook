class ContentContextError extends Error {
  constructor(message, status, code) {
    super(message)
    this.name = new.target.name
    this.status = status
    this.code = code
  }
}

class ValidationError extends ContentContextError {
  constructor(message) {
    super(message, 400, 'validation_error')
  }
}

class ForbiddenError extends ContentContextError {
  constructor(message) {
    super(message, 403, 'forbidden')
  }
}

class NotFoundError extends ContentContextError {
  constructor(message) {
    super(message, 404, 'not_found')
  }
}

class ConflictError extends ContentContextError {
  constructor(message) {
    super(message, 409, 'conflict')
  }
}

export { ConflictError, ContentContextError, ForbiddenError, NotFoundError, ValidationError }

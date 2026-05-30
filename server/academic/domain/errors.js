class AcademicError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.name = this.constructor.name
    this.status = status
  }
}

class ValidationError extends AcademicError {
  constructor(message) {
    super(message, 400)
  }
}

export { AcademicError, ValidationError }

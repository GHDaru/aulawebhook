function resolveOrigin(req) {
  const protocol = req.headers['x-forwarded-proto'] || 'https'
  return `${protocol}://${req.headers.host}`
}

function buildStudentUrl(origin, disciplineId, lessonId) {
  return `${origin}/student/${encodeURIComponent(disciplineId)}/${encodeURIComponent(lessonId)}`
}

function parseJsonBody(body) {
  if (!body) {
    return {}
  }

  if (typeof body === 'string') {
    return JSON.parse(body)
  }

  return body
}

function toSingleQueryValue(value) {
  if (Array.isArray(value)) {
    return value[0]
  }
  return value
}

export { buildStudentUrl, parseJsonBody, resolveOrigin, toSingleQueryValue }

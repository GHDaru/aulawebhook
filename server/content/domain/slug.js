const MAX_SLUG_ATTEMPTS = 100

function normalizeBaseName(filename) {
  if (typeof filename !== 'string') {
    return ''
  }

  return filename.replace(/\.html?$/i, '')
}

function slugify(value, fallback) {
  const normalized = normalizeBaseName(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

  return normalized || fallback
}

function validateSlug(value) {
  return typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(value)
}

function pickAvailableSlug(baseSlug, existingSlugs) {
  const taken = new Set(existingSlugs)

  for (let suffix = 1; suffix <= MAX_SLUG_ATTEMPTS; suffix += 1) {
    const candidate = suffix === 1 ? baseSlug : `${baseSlug}-${suffix}`
    if (!taken.has(candidate)) {
      return candidate
    }
  }

  return null
}

export { MAX_SLUG_ATTEMPTS, normalizeBaseName, pickAvailableSlug, slugify, validateSlug }

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

async function generateUniqueSlug({ value, fallback, exists }) {
  const baseSlug = slugify(value, fallback)
  
  for (let attempt = 1; attempt <= MAX_SLUG_ATTEMPTS; attempt += 1) {
    const candidate = attempt === 1 ? baseSlug : `${baseSlug}-${attempt}`
    const alreadyExists = await exists(candidate)
    if (!alreadyExists) {
      return { baseSlug, slug: candidate }
    }
  }

  return null
}

export { MAX_SLUG_ATTEMPTS, generateUniqueSlug, normalizeBaseName, slugify, validateSlug }

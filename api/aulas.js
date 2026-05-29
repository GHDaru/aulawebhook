import { extractActor } from './authz.js'
import { formatContentError, listDisciplines, registerDiscipline } from '../server/content/application/use-cases.js'
import { createContentRepository } from '../server/content/infrastructure/neon-content-repository.js'
import { parseJsonBody, resolveOrigin } from '../server/content/infrastructure/http.js'

async function listPublishedDisciplines(req, res) {
  try {
    const payload = await listDisciplines({
      actor: extractActor(req),
      origin: resolveOrigin(req),
      repository: await createContentRepository(),
    })

    return res.status(200).json(payload)
  } catch (error) {
    const failure = formatContentError(error, 'Erro ao listar disciplinas publicadas.')
    return res.status(failure.status).json(failure.body)
  }
}

async function createManagedDiscipline(req, res) {
  try {
    const body = parseJsonBody(req.body)
    const discipline = await registerDiscipline({
      title: body.title,
      actor: extractActor(req),
      repository: await createContentRepository(),
    })

    return res.status(201).json(discipline)
  } catch (error) {
    const failure = formatContentError(error, 'Erro ao cadastrar disciplina.')
    return res.status(failure.status).json(failure.body)
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return listPublishedDisciplines(req, res)
  }

  if (req.method === 'POST') {
    return createManagedDiscipline(req, res)
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Método não permitido.' })
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

const PORTAL_DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatPortalDate(value) {
  try {
    return PORTAL_DATE_FORMATTER.format(new Date(value))
  } catch {
    return 'Data indisponível'
  }
}

function TeacherView() {
  const [file, setFile] = useState(null)
  const [activeTab, setActiveTab] = useState('publish')
  const [loading, setLoading] = useState(false)
  const [portalsLoading, setPortalsLoading] = useState(true)
  const [portalsError, setPortalsError] = useState('')
  const [portals, setPortals] = useState([])
  const [copiedUrl, setCopiedUrl] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const canSubmit = useMemo(() => Boolean(file) && !loading, [file, loading])

  const loadPortals = useCallback(async () => {
    setPortalsLoading(true)
    setPortalsError('')

    try {
      const response = await fetch('/api/aulas')
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Falha ao carregar os portais ativos.')
      }

      setPortals(payload.lessons || [])
    } catch (loadError) {
      setPortalsError(loadError.message || 'Não foi possível carregar os portais.')
    } finally {
      setPortalsLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    const fetchInitialPortals = async () => {
      try {
        const response = await fetch('/api/aulas')
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(payload.error || 'Falha ao carregar os portais ativos.')
        }

        if (active) {
          setPortals(payload.lessons || [])
        }
      } catch (loadError) {
        if (active) {
          setPortalsError(loadError.message || 'Não foi possível carregar os portais.')
        }
      } finally {
        if (active) {
          setPortalsLoading(false)
        }
      }
    }

    fetchInitialPortals()

    return () => {
      active = false
    }
  }, [])

  const handleCopy = useCallback(async (url) => {
    await navigator.clipboard.writeText(url)
    setCopiedUrl(url)
  }, [])

  const handleDelete = useCallback(async (slug) => {
    setPortalsError('')

    try {
      const response = await fetch(`/api/aulas/${slug}`, {
        method: 'DELETE',
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Não foi possível apagar o portal.')
      }

      setPortals((currentPortals) => currentPortals.filter((portal) => portal.slug !== slug))
      if (result?.slug === slug) {
        setResult(null)
      }
    } catch (deleteError) {
      setPortalsError(deleteError.message || 'Não foi possível apagar o portal.')
    }
  }, [result])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setResult(null)

    if (!file) {
      setError('Selecione um arquivo HTML para publicar a aula.')
      return
    }

    setLoading(true)
    try {
      const html = await file.text()

      const response = await fetch('/api/aulas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          html,
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Falha ao publicar a aula.')
      }

      setResult(payload)
      setActiveTab('portals')
      setFile(null)
      await loadPortals()
    } catch (uploadError) {
      setError(uploadError.message || 'Não foi possível publicar a aula.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="container">
      <section className="hero card hero-card">
        <div>
          <span className="eyebrow">Tema Esmeralda Acadêmico</span>
          <h1>Painel de Portais Acadêmicos</h1>
          <p className="subtitle">
            Visual limpo, profissional e inspirado nas identidades universitárias da UDESC para
            publicar aulas e compartilhar links públicos com a turma.
          </p>
        </div>

        <div className="hero-stats">
          <div className="stat-card">
            <span className="stat-label">Portais ativos</span>
            <strong>{portals.length}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Rota pública</span>
            <strong>/student/...</strong>
          </div>
        </div>
      </section>

      <div className="tabs" role="tablist" aria-label="Gerenciamento acadêmico">
        <button
          className={`tab ${activeTab === 'publish' ? 'tab-active' : ''}`}
          type="button"
          onClick={() => setActiveTab('publish')}
        >
          Publicar disciplina
        </button>
        <button
          className={`tab ${activeTab === 'portals' ? 'tab-active' : ''}`}
          type="button"
          onClick={() => setActiveTab('portals')}
        >
          Portais Ativos
        </button>
      </div>

      {activeTab === 'publish' && (
        <>
          <form className="card" onSubmit={handleSubmit}>
            <label htmlFor="html-file">Arquivo HTML da disciplina</label>
            <input
              id="html-file"
              type="file"
              accept=".html,text/html"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />

            <p className="helper-text">
              O nome do arquivo vira o link acadêmico público, como{' '}
              <span className="inline-code">/student/matricula-udesc-exemplo</span>.
            </p>

            <button className="btn" type="submit" disabled={!canSubmit}>
              {loading ? 'Publicando...' : 'Publicar disciplina'}
            </button>
          </form>

          {error && <p className="error">{error}</p>}

          {result && (
            <section className="card success">
              <h2>Portal publicado com sucesso</h2>
              <p className="success-text">
                {result.title} já está pronto para compartilhamento com a turma.
              </p>
              <a className="portal-link" href={result.studentUrl} target="_blank" rel="noreferrer">
                {result.studentUrl}
              </a>
              <div className="actions">
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => handleCopy(result.studentUrl)}
                >
                  Copiar link público
                </button>
                <a
                  className="btn btn-secondary"
                  href={result.studentUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir portal
                </a>
              </div>
            </section>
          )}
        </>
      )}

      {activeTab === 'portals' && (
        <section className="card portals-card">
          <div className="section-heading">
            <div>
              <h2>Portais Ativos</h2>
              <p className="subtitle section-subtitle">
                Veja as disciplinas criadas, copie o link público com 1 clique e apague portais
                quando necessário.
              </p>
            </div>
            <button className="btn btn-secondary" type="button" onClick={loadPortals}>
              Atualizar lista
            </button>
          </div>

          {portalsError && <p className="error">{portalsError}</p>}
          {copiedUrl && <p className="helper-text">Link copiado: {copiedUrl}</p>}

          {portalsLoading ? (
            <p className="empty-state">Carregando portais ativos...</p>
          ) : portals.length === 0 ? (
            <div className="empty-state">
              <strong>Nenhum portal ativo no momento.</strong>
              <span>Publique uma disciplina para gerar o primeiro link acadêmico.</span>
            </div>
          ) : (
            <div className="portal-list">
              {portals.map((portal) => (
                <article className="portal-item" key={portal.slug}>
                  <div className="portal-copy">
                    <span className="portal-badge">Disciplina publicada</span>
                    <h3>{portal.title}</h3>
                    <p className="portal-meta">Atualizado em {formatPortalDate(portal.uploadedAt)}</p>
                    <a
                      className="portal-link"
                      href={portal.studentUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {portal.studentUrl}
                    </a>
                  </div>

                  <div className="actions portal-actions">
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => handleCopy(portal.studentUrl)}
                    >
                      Copiar link
                    </button>
                    <button
                      className="btn btn-danger"
                      type="button"
                      onClick={() => handleDelete(portal.slug)}
                    >
                      Apagar portal
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  )
}

function StudentView({ lessonId }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [html, setHtml] = useState('')

  useEffect(() => {
    let active = true

    const loadLesson = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(`/api/aulas/${lessonId}`)
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(payload.error || 'Aula não encontrada.')
        }

        if (active) {
          setHtml(payload.html)
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || 'Erro ao carregar aula.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadLesson()

    return () => {
      active = false
    }
  }, [lessonId])

  if (loading) {
    return (
      <main className="container">
        <p>Carregando aula...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="container">
        <h1>Aula indisponível</h1>
        <p className="error">{error}</p>
      </main>
    )
  }

  return (
    <main className="full-lesson">
      <iframe
        title="Aula interativa"
        srcDoc={html}
        sandbox="allow-scripts allow-forms allow-downloads allow-modals allow-popups"
      />
    </main>
  )
}

function App() {
  const path = window.location.pathname
  const match = path.match(/^\/(?:aula|student)\/([^/]+)$/)

  if (match) {
    return <StudentView lessonId={decodeURIComponent(match[1])} />
  }

  return <TeacherView />
}

export default App

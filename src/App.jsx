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
  const [disciplineTitle, setDisciplineTitle] = useState('')
  const [lessonTitle, setLessonTitle] = useState('')
  const [selectedDiscipline, setSelectedDiscipline] = useState('')
  const [activeTab, setActiveTab] = useState('publish')
  const [loading, setLoading] = useState(false)
  const [disciplineLoading, setDisciplineLoading] = useState(false)
  const [portalsLoading, setPortalsLoading] = useState(true)
  const [portalsError, setPortalsError] = useState('')
  const [disciplines, setDisciplines] = useState([])
  const [copiedUrl, setCopiedUrl] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const canSubmitLesson = useMemo(
    () => Boolean(file) && Boolean(selectedDiscipline) && !loading,
    [file, loading, selectedDiscipline],
  )

  const applyDisciplines = useCallback((listed) => {
    setDisciplines(listed)

    if (!selectedDiscipline && listed[0]?.id) {
      setSelectedDiscipline(listed[0].id)
      return
    }

    if (selectedDiscipline && !listed.some((discipline) => discipline.id === selectedDiscipline)) {
      setSelectedDiscipline(listed[0]?.id || '')
    }
  }, [selectedDiscipline])

  const loadDisciplines = useCallback(async () => {
    try {
      const response = await fetch('/api/aulas')
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Falha ao carregar as disciplinas.')
      }

      const listed = payload.lessons || []
      applyDisciplines(listed)
    } catch (loadError) {
      setPortalsError(loadError.message || 'Não foi possível carregar as disciplinas.')
    } finally {
      setPortalsLoading(false)
    }
  }, [applyDisciplines])

  useEffect(() => {
    let active = true

    fetch('/api/aulas')
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload.error || 'Falha ao carregar as disciplinas.')
        }
        return payload
      })
      .then((payload) => {
        if (!active) {
          return
        }
        applyDisciplines(payload.lessons || [])
      })
      .catch((loadError) => {
        if (active) {
          setPortalsError(loadError.message || 'Não foi possível carregar as disciplinas.')
        }
      })
      .finally(() => {
        if (active) {
          setPortalsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [applyDisciplines])

  const handleRefreshDisciplines = useCallback(() => {
    setPortalsLoading(true)
    setPortalsError('')
    loadDisciplines()
  }, [loadDisciplines])

  const handleCopy = useCallback(async (url) => {
    await navigator.clipboard.writeText(url)
    setCopiedUrl(url)
  }, [])

  const handleDeleteDiscipline = useCallback(async (disciplineId) => {
    setPortalsError('')

    try {
      const response = await fetch(`/api/aulas/${disciplineId}`, {
        method: 'DELETE',
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Não foi possível apagar a disciplina.')
      }

      setDisciplines((current) => current.filter((discipline) => discipline.id !== disciplineId))
      if (selectedDiscipline === disciplineId) {
        setSelectedDiscipline('')
      }
      if (result?.disciplineId === disciplineId) {
        setResult(null)
      }
    } catch (deleteError) {
      setPortalsError(deleteError.message || 'Não foi possível apagar a disciplina.')
    }
  }, [result, selectedDiscipline])

  const handleCreateDiscipline = useCallback(async (event) => {
    event.preventDefault()
    setError('')

    const trimmedTitle = disciplineTitle.trim()
    if (trimmedTitle.length < 3) {
      setError('Informe o nome da disciplina com pelo menos 3 caracteres.')
      return
    }

    setDisciplineLoading(true)

    try {
      const response = await fetch('/api/aulas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmedTitle }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Falha ao criar disciplina.')
      }

      setDisciplineTitle('')
      setSelectedDiscipline(payload.id)
      setPortalsLoading(true)
      await loadDisciplines()
    } catch (createError) {
      setError(createError.message || 'Não foi possível criar a disciplina.')
    } finally {
      setDisciplineLoading(false)
    }
  }, [disciplineTitle, loadDisciplines])

  const handleSubmitLesson = async (event) => {
    event.preventDefault()
    setError('')
    setResult(null)

    if (!file || !selectedDiscipline) {
      setError('Selecione uma disciplina e um arquivo HTML para incluir a aula.')
      return
    }

    setLoading(true)
    try {
      const html = await file.text()

      const response = await fetch(`/api/aulas/${selectedDiscipline}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          html,
          title: lessonTitle.trim() || undefined,
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Falha ao incluir aula.')
      }

      setResult(payload)
      setLessonTitle('')
      setFile(null)
      setActiveTab('portals')
      setPortalsLoading(true)
      await loadDisciplines()
    } catch (uploadError) {
      setError(uploadError.message || 'Não foi possível incluir a aula.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="container">
      <section className="hero card hero-card">
        <div>
          <span className="eyebrow">Tema Esmeralda Acadêmico</span>
          <h1>Painel de Disciplinas e Aulas</h1>
          <p className="subtitle">
            Cadastre disciplinas, inclua aulas em sequência e compartilhe links públicos com navegação
            entre o conteúdo.
          </p>
        </div>

        <div className="hero-stats">
          <div className="stat-card">
            <span className="stat-label">Disciplinas ativas</span>
            <strong>{disciplines.length}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Rota pública</span>
            <strong>/student/.../...</strong>
          </div>
        </div>
      </section>

      <div className="tabs" role="tablist" aria-label="Gerenciamento acadêmico">
        <button
          className={`tab ${activeTab === 'publish' ? 'tab-active' : ''}`}
          type="button"
          onClick={() => setActiveTab('publish')}
        >
          Cadastrar conteúdo
        </button>
        <button
          className={`tab ${activeTab === 'portals' ? 'tab-active' : ''}`}
          type="button"
          onClick={() => setActiveTab('portals')}
        >
          Disciplinas Ativas
        </button>
      </div>

      {activeTab === 'publish' && (
        <>
          <form className="card" onSubmit={handleCreateDiscipline}>
            <h2>Criar disciplina</h2>
            <label htmlFor="discipline-title">Nome da disciplina</label>
            <input
              id="discipline-title"
              type="text"
              value={disciplineTitle}
              placeholder="Ex.: Banco de Dados I"
              onChange={(event) => setDisciplineTitle(event.target.value)}
            />

            <button className="btn" type="submit" disabled={disciplineLoading}>
              {disciplineLoading ? 'Cadastrando...' : 'Cadastrar disciplina'}
            </button>
          </form>

          <form className="card" onSubmit={handleSubmitLesson}>
            <h2>Incluir aula na disciplina</h2>
            <label htmlFor="discipline-select">Disciplina</label>
            <select
              id="discipline-select"
              value={selectedDiscipline}
              onChange={(event) => setSelectedDiscipline(event.target.value)}
            >
              <option value="">Selecione uma disciplina</option>
              {disciplines.map((discipline) => (
                <option key={discipline.id} value={discipline.id}>
                  {discipline.title}
                </option>
              ))}
            </select>

            <label htmlFor="lesson-title">Título da aula (opcional)</label>
            <input
              id="lesson-title"
              type="text"
              value={lessonTitle}
              placeholder="Ex.: Aula 1 - Introdução"
              onChange={(event) => setLessonTitle(event.target.value)}
            />

            <label htmlFor="html-file">Arquivo HTML da aula</label>
            <input
              id="html-file"
              type="file"
              accept=".html,text/html"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />

            <p className="helper-text">
              Cada nova aula é adicionada no fim da disciplina para permitir navegação anterior/próxima.
            </p>

            <button className="btn" type="submit" disabled={!canSubmitLesson}>
              {loading ? 'Incluindo...' : 'Incluir aula'}
            </button>
          </form>

          {error && <p className="error">{error}</p>}

          {result && (
            <section className="card success">
              <h2>Aula incluída com sucesso</h2>
              <p className="success-text">
                {result.title} foi adicionada em <strong>{result.disciplineTitle}</strong> na posição{' '}
                {result.order}.
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
                <a className="btn btn-secondary" href={result.studentUrl} target="_blank" rel="noreferrer">
                  Abrir aula
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
              <h2>Disciplinas Ativas</h2>
              <p className="subtitle section-subtitle">
                Veja as disciplinas cadastradas e as aulas ordenadas de cada uma.
              </p>
            </div>
            <button className="btn btn-secondary" type="button" onClick={handleRefreshDisciplines}>
              Atualizar lista
            </button>
          </div>

          {portalsError && <p className="error">{portalsError}</p>}
          {copiedUrl && <p className="helper-text">Link copiado: {copiedUrl}</p>}

          {portalsLoading ? (
            <p className="empty-state">Carregando disciplinas...</p>
          ) : disciplines.length === 0 ? (
            <div className="empty-state">
              <strong>Nenhuma disciplina ativa no momento.</strong>
              <span>Cadastre uma disciplina e inclua a primeira aula.</span>
            </div>
          ) : (
            <div className="portal-list">
              {disciplines.map((discipline) => (
                <article className="portal-item" key={discipline.id}>
                  <div className="portal-copy">
                    <span className="portal-badge">Disciplina cadastrada</span>
                    <h3>{discipline.title}</h3>
                    <p className="portal-meta">Criada em {formatPortalDate(discipline.createdAt)}</p>

                    {discipline.lessons.length === 0 ? (
                      <p className="helper-text">Sem aulas cadastradas ainda.</p>
                    ) : (
                      <ol className="lesson-list">
                        {discipline.lessons.map((lesson) => (
                          <li key={lesson.id}>
                            <span>
                              Aula {lesson.order}: {lesson.title}
                            </span>
                            <div className="actions lesson-actions">
                              <a
                                className="btn btn-secondary"
                                href={lesson.studentUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Abrir
                              </a>
                              <button
                                className="btn btn-secondary"
                                type="button"
                                onClick={() => handleCopy(lesson.studentUrl)}
                              >
                                Copiar link
                              </button>
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>

                  <div className="actions portal-actions">
                    <button
                      className="btn btn-danger"
                      type="button"
                      onClick={() => handleDeleteDiscipline(discipline.id)}
                    >
                      Apagar disciplina
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

function StudentView({ disciplineId, lessonId }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [html, setHtml] = useState('')
  const [metadata, setMetadata] = useState(null)

  useEffect(() => {
    let active = true

    const loadLesson = async () => {
      setLoading(true)
      setError('')

      try {
        const endpoint = disciplineId
          ? `/api/aulas/${encodeURIComponent(disciplineId)}?lesson=${encodeURIComponent(lessonId)}`
          : `/api/aulas/${encodeURIComponent(lessonId)}`

        const response = await fetch(endpoint)
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(payload.error || 'Aula não encontrada.')
        }

        if (active) {
          setHtml(payload.html)
          setMetadata(payload.navigation ? payload : null)
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
  }, [disciplineId, lessonId])

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
    <main className="lesson-wrapper">
      {metadata && (
        <header className="lesson-nav">
          <div>
            <strong>{metadata.discipline.title}</strong>
            <p className="portal-meta">
              {metadata.lesson.title} ({metadata.navigation.index}/{metadata.navigation.total})
            </p>
          </div>

          <div className="actions">
            <a
              className={`btn btn-secondary ${!metadata.navigation.previousUrl ? 'btn-disabled' : ''}`}
              href={metadata.navigation.previousUrl || '#'}
              aria-disabled={!metadata.navigation.previousUrl}
              onClick={(event) => {
                if (!metadata.navigation.previousUrl) {
                  event.preventDefault()
                }
              }}
            >
              Aula anterior
            </a>
            <a
              className={`btn btn-secondary ${!metadata.navigation.nextUrl ? 'btn-disabled' : ''}`}
              href={metadata.navigation.nextUrl || '#'}
              aria-disabled={!metadata.navigation.nextUrl}
              onClick={(event) => {
                if (!metadata.navigation.nextUrl) {
                  event.preventDefault()
                }
              }}
            >
              Próxima aula
            </a>
          </div>
        </header>
      )}

      <section className="full-lesson">
        <iframe
          title="Aula interativa"
          srcDoc={html}
          sandbox="allow-scripts allow-forms allow-downloads allow-modals allow-popups"
        />
      </section>
    </main>
  )
}

function App() {
  const path = window.location.pathname
  const fullMatch = path.match(/^\/(?:aula|student)\/([^/]+)\/([^/]+)$/)

  if (fullMatch) {
    return (
      <StudentView
        disciplineId={decodeURIComponent(fullMatch[1])}
        lessonId={decodeURIComponent(fullMatch[2])}
      />
    )
  }

  const legacyMatch = path.match(/^\/(?:aula|student)\/([^/]+)$/)
  if (legacyMatch) {
    return <StudentView lessonId={decodeURIComponent(legacyMatch[1])} />
  }

  return <TeacherView />
}

export default App

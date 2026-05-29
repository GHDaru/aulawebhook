import { initDb } from '../../../api/db.js'

async function createContentRepository() {
  const sql = await initDb()

  return {
    async listDisciplines({ professorId } = {}) {
      const rows = professorId
        ? await sql`
            SELECT id, title, professor_id, created_at
            FROM disciplinas
            WHERE professor_id = ${professorId}
            ORDER BY created_at DESC
          `
        : await sql`
            SELECT id, title, professor_id, created_at
            FROM disciplinas
            ORDER BY created_at DESC
          `

      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        professorId: row.professor_id || null,
        createdAt: row.created_at,
      }))
    },

    async listLessonsByDisciplineIds(disciplineIds) {
      if (!disciplineIds.length) return []

      const rows = await sql`
        SELECT id, disciplina_id, title, lesson_order, created_at
        FROM aulas
        WHERE disciplina_id = ANY(${disciplineIds})
        ORDER BY disciplina_id ASC, lesson_order ASC
      `

      return rows.map((row) => ({
        id: row.id,
        disciplineId: row.disciplina_id,
        title: row.title,
        order: row.lesson_order,
        createdAt: row.created_at,
      }))
    },

    async hasDisciplineWithId(id) {
      const existing = await sql`SELECT 1 FROM disciplinas WHERE id = ${id} LIMIT 1`
      return existing.length > 0
    },

    async createDiscipline(discipline) {
      await sql`
        INSERT INTO disciplinas (id, title, professor_id)
        VALUES (${discipline.id}, ${discipline.title}, ${discipline.professorId})
      `
    },

    async findDisciplineById(id) {
      const rows = await sql`
        SELECT id, title, professor_id, created_at
        FROM disciplinas
        WHERE id = ${id}
        LIMIT 1
      `

      if (!rows.length) return null

      return {
        id: rows[0].id,
        title: rows[0].title,
        professorId: rows[0].professor_id || null,
        createdAt: rows[0].created_at,
      }
    },

    async hasLessonWithId(id) {
      const existing = await sql`SELECT 1 FROM aulas WHERE id = ${id} LIMIT 1`
      return existing.length > 0
    },

    async getNextLessonOrder(disciplineId) {
      const rows = await sql`
        SELECT COALESCE(MAX(lesson_order), 0) AS max_order
        FROM aulas
        WHERE disciplina_id = ${disciplineId}
      `

      return Number(rows[0]?.max_order ?? 0) + 1
    },

    async createLesson(lesson) {
      await sql`
        INSERT INTO aulas (id, html, disciplina_id, lesson_order, title)
        VALUES (${lesson.id}, ${lesson.html}, ${lesson.disciplineId}, ${lesson.order}, ${lesson.title})
      `
    },

    async listLessonsByDiscipline(disciplineId) {
      const rows = await sql`
        SELECT id, html, title, lesson_order
        FROM aulas
        WHERE disciplina_id = ${disciplineId}
        ORDER BY lesson_order ASC
      `

      return rows.map((row) => ({
        id: row.id,
        html: row.html,
        title: row.title,
        order: row.lesson_order,
      }))
    },

    async findLegacyLessonById(id) {
      const rows = await sql`
        SELECT html
        FROM aulas
        WHERE id = ${id}
          AND disciplina_id IS NULL
        LIMIT 1
      `

      if (!rows.length) return null
      return { id, html: rows[0].html }
    },

    async deleteDiscipline(id) {
      await sql`DELETE FROM aulas WHERE disciplina_id = ${id}`
      await sql`DELETE FROM disciplinas WHERE id = ${id}`
    },

    async deleteLegacyLesson(id) {
      const deleted = await sql`
        DELETE FROM aulas
        WHERE id = ${id}
          AND disciplina_id IS NULL
        RETURNING id
      `

      return deleted.length > 0
    },
  }
}

export { createContentRepository }

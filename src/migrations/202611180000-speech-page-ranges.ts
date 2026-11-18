// import type { QueryInterface } from 'sequelize'

// export async function up({ context }: { context: QueryInterface }) {
//   await context.sequelize.query(`
//     ALTER TABLE api_speech
//       ADD COLUMN source_page_start integer,
//       ADD COLUMN source_page_end integer,
//       ADD COLUMN pdf_page_start integer,
//       ADD COLUMN pdf_page_end integer
//   `)
// }

// export async function down({ context }: { context: QueryInterface }) {
//   await context.sequelize.query(`
//     ALTER TABLE api_speech
//       DROP COLUMN source_page_start,
//       DROP COLUMN source_page_end,
//       DROP COLUMN pdf_page_start,
//       DROP COLUMN pdf_page_end
//   `)
// }

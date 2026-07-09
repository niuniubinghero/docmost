import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Enable pgvector extension
  await sql`CREATE EXTENSION IF NOT EXISTS vector`.execute(db);

  await db.schema
    .createTable('page_embeddings')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_uuid_v7()`),
    )
    .addColumn('page_id', 'uuid', (col) =>
      col.references('pages.id').onDelete('cascade').notNull(),
    )
    .addColumn('space_id', 'uuid', (col) =>
      col.references('spaces.id').onDelete('cascade').notNull(),
    )
    .addColumn('workspace_id', 'uuid', (col) =>
      col.references('workspaces.id').onDelete('cascade').notNull(),
    )
    .addColumn('model_name', 'varchar(255)', (col) => col.notNull())
    .addColumn('model_dimensions', 'integer', (col) => col.notNull())
    .addColumn('attachment_id', 'uuid')
    .addColumn('embedding', sql`vector(1536)`)
    .addColumn('chunk_index', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('chunk_start', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('chunk_length', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('metadata', 'jsonb', (col) => col.defaultTo(sql`'{}'::jsonb`))
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('deleted_at', 'timestamptz')
    .execute();

  await db.schema
    .createIndex('page_embeddings_page_id_idx')
    .on('page_embeddings')
    .column('page_id')
    .execute();

  await db.schema
    .createIndex('page_embeddings_workspace_id_idx')
    .on('page_embeddings')
    .column('workspace_id')
    .execute();

  await db.schema
    .createIndex('page_embeddings_space_id_idx')
    .on('page_embeddings')
    .column('space_id')
    .execute();

  // HNSW index for vector similarity search
  await sql`
    CREATE INDEX page_embeddings_embedding_idx
    ON page_embeddings
    USING hnsw (embedding vector_cosine_ops)
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex('page_embeddings_embedding_idx').ifExists().execute();
  await db.schema.dropIndex('page_embeddings_space_id_idx').ifExists().execute();
  await db.schema.dropIndex('page_embeddings_workspace_id_idx').ifExists().execute();
  await db.schema.dropIndex('page_embeddings_page_id_idx').ifExists().execute();
  await db.schema.dropTable('page_embeddings').ifExists().execute();
  await sql`DROP EXTENSION IF EXISTS vector`.execute(db);
}

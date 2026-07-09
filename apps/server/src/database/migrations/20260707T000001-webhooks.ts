import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('webhooks')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_uuid_v7()`),
    )
    .addColumn('workspace_id', 'uuid', (col) =>
      col.notNull().references('workspaces.id').onDelete('cascade'),
    )
    .addColumn('url', 'varchar', (col) => col.notNull())
    .addColumn('secret', 'varchar', (col) => col.notNull())
    .addColumn('events', 'jsonb', (col) => col.notNull())
    .addColumn('enabled', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createIndex('webhooks_workspace_id_idx')
    .on('webhooks')
    .column('workspace_id')
    .execute();

  await db.schema
    .createTable('webhook_deliveries')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_uuid_v7()`),
    )
    .addColumn('webhook_id', 'uuid', (col) =>
      col.notNull().references('webhooks.id').onDelete('cascade'),
    )
    .addColumn('event', 'varchar', (col) => col.notNull())
    .addColumn('payload', 'jsonb')
    .addColumn('status_code', 'integer')
    .addColumn('response_body', 'text')
    .addColumn('attempt', 'integer', (col) => col.notNull().defaultTo(1))
    .addColumn('status', 'varchar', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createIndex('webhook_deliveries_webhook_id_idx')
    .on('webhook_deliveries')
    .column('webhook_id')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('webhook_deliveries').execute();
  await db.schema.dropTable('webhooks').execute();
}

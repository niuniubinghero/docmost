import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('apiKeys')
    .addColumn('key_hash', 'varchar(64)', (col) => col)
    .execute();

  await db.schema
    .createIndex('api_keys_key_hash_idx')
    .on('apiKeys')
    .column('keyHash')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex('api_keys_key_hash_idx').execute();
  await db.schema.alterTable('apiKeys').dropColumn('keyHash').execute();
}

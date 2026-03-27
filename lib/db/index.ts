import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!.trim();

// Use transaction pooler URL (port 6543) from Supabase for serverless
const client = postgres(connectionString, { max: 10, ssl: 'require' });

export const db = drizzle(client, { schema });
export * from './schema';

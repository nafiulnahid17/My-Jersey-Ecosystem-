import path from 'node:path';
import process from 'node:process';

function readBoolean(value, fallback = false) {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

const supabaseUrl = process.env.SUPABASE_URL?.trim() ?? '';
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY?.trim() ?? '';

if (Boolean(supabaseUrl) !== Boolean(supabaseSecretKey)) {
  throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY must be configured together.');
}

export const config = Object.freeze({
  port: Number.parseInt(process.env.PORT ?? '3000', 10),
  host: process.env.HOST ?? '127.0.0.1',
  adminApiKey: process.env.ADMIN_API_KEY?.trim() ?? '',
  databasePath: path.resolve(process.cwd(), process.env.DATABASE_PATH ?? './data/my-jersey.sqlite'),
  publicPath: path.resolve(process.cwd(), 'public'),
  trustProxy: readBoolean(process.env.TRUST_PROXY),
  bodyLimitBytes: 256 * 1024,
  supabaseUrl,
  supabaseSecretKey,
  databaseProvider: supabaseUrl ? 'supabase' : 'sqlite',
});

if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

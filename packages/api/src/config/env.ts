export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '4000', 10),
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/novastream',
  REQUEST_TIMEOUT_MS: parseInt(process.env.REQUEST_TIMEOUT_MS ?? '20000', 10),
  DEFAULT_USER_AGENT: process.env.DEFAULT_USER_AGENT ?? 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
};

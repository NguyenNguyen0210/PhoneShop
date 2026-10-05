// Single source of truth for which dotenv file to load.
// - DOTENV_FILE set → explicit path override (e.g. DOTENV_FILE=/run/secrets/app.env).
// - Otherwise: '.env.production' when NODE_ENV=production, '.env.development' fallback.
// Missing files are tolerated: dotenv/ConfigModule keep process.env (platform-injected vars win).
export function resolveEnvFile(): string {
  const override = (process.env.DOTENV_FILE ?? '').trim();
  if (override) return override;
  return process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
}

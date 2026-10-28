// Preloads the env file matching NODE_ENV into process.env BEFORE any
// other application import runs.
// This module MUST stay the first import in main.ts: ES imports execute
// depth-first in source order, so dotenv runs before the rest of the
// import graph. A dotenv.config() call placed in main.ts body would NOT
// work — under CommonJS emit all require()s run before body statements.
import * as dotenv from 'dotenv';
import * as path from 'path';
import { resolveEnvFile } from './config/resolve-env-file';

if (!process.env.NODE_ENV) {
  console.warn('[env] NODE_ENV is unset — falling back to .env.development');
}
dotenv.config({ path: path.resolve(process.cwd(), resolveEnvFile()) });

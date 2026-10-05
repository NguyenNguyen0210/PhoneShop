// Preloads the env file matching NODE_ENV into process.env BEFORE any
// other application import runs. Several modules read process.env at
// import time (e.g. REDIS_ENABLED in background-jobs and orders modules
// to decide between real BullMQ queues and the local fallback). Nest's
// ConfigModule populates process.env only later during bootstrap — too
// late for those constants.
//
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

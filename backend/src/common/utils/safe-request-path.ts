import type { Request } from 'express';

// Prefer the route template so URL query values and token-like path parameters
// never reach logs or the generic exception response.
export function safeRequestPath(request: Request): string {
  const routePath: unknown = request.route?.path;
  if (typeof routePath === 'string') {
    return `${request.baseUrl ?? ''}${routePath}` || '/';
  }
  return '[unmatched route]';
}

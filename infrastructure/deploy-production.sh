#!/usr/bin/env bash
set -euo pipefail

# The previous API image can be restored after a failed rollout. Schema
# migrations are forward-only; restoring the DB requires the verified backup.
: "${PRODUCTION_BACKUP_REFERENCE:?Provide a verified database backup reference}"

compose=(docker compose -f docker-compose.prod.yml)
test -f backend/.env.production || { echo 'Missing backend/.env.production on server' >&2; exit 1; }
"${compose[@]}" config --quiet

# The release tag might point to a failed candidate after an earlier attempt.
# The container's immutable image ID identifies the last actually deployed API.
previous_image="$(docker container inspect phoneshop_backend_prod --format '{{.Image}}' 2>/dev/null || true)"

restore_previous_api() {
  if [[ -z "$previous_image" ]]; then
    echo 'No previously deployed API image exists for automatic recovery.' >&2
    return 1
  fi
  echo 'Restoring previously deployed API image. Database migrations are NOT rolled back.' >&2
  docker image tag "$previous_image" phoneshop-backend:release
  "${compose[@]}" up -d --force-recreate --no-deps backend
}

"${compose[@]}" build backend

# Failed migration stops the release before the running service is changed.
if ! "${compose[@]}" --profile migration run --rm --no-deps \
  -e PRODUCTION_BACKUP_REFERENCE="$PRODUCTION_BACKUP_REFERENCE" migrate; then
  echo 'Migration failed. The running API was not replaced.' >&2
  # Restore the image tag to match the still-running container for future deploys.
  if [[ -n "$previous_image" ]]; then
    docker image tag "$previous_image" phoneshop-backend:release
  fi
  exit 1
fi

if ! "${compose[@]}" up -d --no-deps backend; then
  echo 'Unable to start the candidate API.' >&2
  restore_previous_api || true
  exit 1
fi

for attempt in $(seq 1 25); do
  health="$(docker inspect phoneshop_backend_prod --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}unknown{{end}}' 2>/dev/null || true)"
  if [[ "$health" == 'healthy' ]]; then
    echo 'Deployment completed: API is healthy.'
    exit 0
  fi
  if [[ "$health" == 'unhealthy' ]]; then break; fi
  sleep 3
done

echo 'API failed its health check; gathering recent logs.' >&2
"${compose[@]}" logs --tail=80 backend >&2 || true
restore_previous_api || true
exit 1

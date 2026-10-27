#!/usr/bin/env bash
# make smoke: builds the production images without .env and checks that they
# start (DEP-32 to DEP-37). Everything it creates is removed at the end, pass or fail.
set -euo pipefail

NAME=animal-helper-smoke
NET=$NAME
DB=$NAME-db
API=$NAME-api
WEB=$NAME-web
TIMEOUT_S=60

DATABASE_URL="postgresql://postgres:smoke@$DB:5432/smoke"
TOKEN=$(openssl rand -hex 24)

cleanup() {
  docker rm -f "$DB" "$API" "$WEB" "$NAME-migrate-a" "$NAME-migrate-b" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# Prints the reason and, when given, the logs of the container that failed.
fail() {
  echo "smoke: FALHOU: $1" >&2
  if [ -n "${2:-}" ]; then docker logs "$2" 2>&1 | tail -50 >&2; fi
  exit 1
}

step() { echo "smoke: $1"; }

# ---------- images (.dockerignore keeps every .env out of the context) ----------
step "construindo as imagens"
docker build -q -f apps/api/Dockerfile.migrate -t "$NAME-migrate" . >/dev/null
docker build -q -f apps/api/Dockerfile --target production -t "$NAME-api" . >/dev/null
docker build -q -f apps/web/Dockerfile --target production --build-arg MAX_UPLOAD_MB=5 -t "$NAME-web" . >/dev/null

step "conferindo que nenhuma imagem leva .env"
for image in "$NAME-migrate" "$NAME-api" "$NAME-web"; do
  found=$(docker run --rm --entrypoint sh "$image" -c \
    "find /app -name '.env*' ! -name '.env.example' -not -path '*/node_modules/*'")
  [ -z "$found" ] || fail "$image tem arquivos de ambiente: $found"
done

# ---------- database and migrations ----------
cleanup
docker network create "$NET" >/dev/null
docker run -d --name "$DB" --network "$NET" \
  -e POSTGRES_PASSWORD=smoke -e POSTGRES_DB=smoke postgres:18-alpine >/dev/null
for _ in $(seq "$TIMEOUT_S"); do
  docker exec "$DB" pg_isready -U postgres -d smoke >/dev/null 2>&1 && break
  sleep 1
done
docker exec "$DB" pg_isready -U postgres -d smoke >/dev/null 2>&1 || fail "o Postgres não ficou pronto" "$DB"

step "aplicando as migrations num banco vazio"
docker run --name "$NAME-migrate-a" --network "$NET" -e DATABASE_URL="$DATABASE_URL" \
  "$NAME-migrate" >/dev/null 2>&1 || fail "o migrate não encerrou com 0" "$NAME-migrate-a"
docker rm "$NAME-migrate-a" >/dev/null

# DEP-04 and DEP-54: two runs at once, nothing pending: both exit 0.
step "rodando dois migrates ao mesmo tempo, sem nada pendente"
docker run -d --name "$NAME-migrate-a" --network "$NET" -e DATABASE_URL="$DATABASE_URL" "$NAME-migrate" >/dev/null
docker run -d --name "$NAME-migrate-b" --network "$NET" -e DATABASE_URL="$DATABASE_URL" "$NAME-migrate" >/dev/null
for container in "$NAME-migrate-a" "$NAME-migrate-b"; do
  [ "$(docker wait "$container")" = 0 ] || fail "$container não encerrou com 0" "$container"
done

# ---------- api (locked demo, no SMTP) and web ----------
step "subindo a api (demo fechada, sem SMTP) e o web"
docker run -d --name "$API" --network "$NET" \
  -e DATABASE_URL="$DATABASE_URL" \
  -e S3_ENDPOINT=http://bucket.invalid -e S3_BUCKET=smoke \
  -e S3_ACCESS_KEY_ID=smoke -e S3_SECRET_ACCESS_KEY=smoke \
  -e WEB_URL=http://localhost:3000 \
  -e INTERNAL_API_TOKEN="$TOKEN" -e IP_HASH_SECRET="$(openssl rand -hex 24)" \
  -e NOMINATIM_USER_AGENT="animal-helper-smoke (smoke@example.com)" \
  -e DEMO_LOCKED=true \
  -e DEMO_ACCOUNT_EMAIL=demo@example.com -e DEMO_ACCOUNT_PASSWORD=smoke-demo-1 \
  "$NAME-api" >/dev/null
docker run -d --name "$WEB" --network "$NET" \
  -e API_URL="http://$API:3333" -e INTERNAL_API_TOKEN="$TOKEN" \
  -e PUBLIC_WEB_URL=http://localhost:3000 \
  -e TILE_URL='https://tile.openstreetmap.org/{z}/{x}/{y}.png' \
  -e TILE_ATTRIBUTION='© OpenStreetMap contributors' \
  -e MAX_UPLOAD_MB=5 \
  "$NAME-web" >/dev/null

# 200 from inside the container, with the image's own Node.
status_of() {
  docker exec "$1" node -e \
    "fetch('$2').then((r) => console.log(r.status)).catch(() => console.log(0))" 2>/dev/null || echo 0
}

wait_for_200() {
  for _ in $(seq "$TIMEOUT_S"); do
    [ "$(status_of "$1" "$2")" = 200 ] && return 0
    sleep 1
  done
  fail "$2 não respondeu 200 em ${TIMEOUT_S}s" "$1"
}

step "esperando GET /health da api"
wait_for_200 "$API" http://localhost:3333/health
step "esperando GET / do web"
wait_for_200 "$WEB" http://localhost:3000/

step "OK"

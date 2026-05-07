#!/bin/sh
# Lê Docker Secrets se disponíveis — substitui env vars expostas em docker inspect
if [ -f /run/secrets/dfe_database_url ]; then
  export DATABASE_URL=$(cat /run/secrets/dfe_database_url)
fi
if [ -f /run/secrets/dfe_jwt_secret ]; then
  export JWT_SECRET=$(cat /run/secrets/dfe_jwt_secret)
fi
if [ -f /run/secrets/dfe_internal_token ]; then
  export INTERNAL_API_TOKEN=$(cat /run/secrets/dfe_internal_token)
fi
npm install && npx prisma generate && exec npx tsx server.ts

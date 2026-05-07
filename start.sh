#!/bin/sh
# Lê Docker Secrets se disponíveis (substitui env vars expostas via docker inspect)
[ -f /run/secrets/dfe_database_url ] && export DATABASE_URL=
[ -f /run/secrets/dfe_jwt_secret ]   && export JWT_SECRET=
npm install && npx prisma generate && exec npx tsx server.ts

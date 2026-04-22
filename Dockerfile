FROM node:20-slim
RUN apt-get update && apt-get install -y openssl
WORKDIR /app
EXPOSE 3001
CMD npm install && npx prisma generate && npx tsx server.ts

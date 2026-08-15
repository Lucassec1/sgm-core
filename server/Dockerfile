# Dockerfile simples para desenvolvimento — evoluir para multi-stage quando for para produção real
# Prisma 5 no Alpine recente pode falhar por incompatibilidade de OpenSSL (libssl.so.1.1).
# Debian slim evita esse problema no ambiente de dev do Compose.
FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 3001

CMD ["npm", "run", "start:dev"]

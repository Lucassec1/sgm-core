# Dockerfile simples para desenvolvimento — evoluir para multi-stage quando for para produção real
# Debian slim (em vez de Alpine) evita problemas de compatibilidade de OpenSSL com o Prisma.
FROM node:20-bookworm-slim

WORKDIR /app

# procps: `nest start --watch` chama `ps` internamente pra reiniciar o processo a cada
# mudança de arquivo — sem isso, o restart falha aleatoriamente com "ps not found".
RUN apt-get update -y && apt-get install -y openssl procps && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 3001

CMD ["npm", "run", "start:dev"]

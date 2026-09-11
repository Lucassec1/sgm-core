# Dockerfile simples para desenvolvimento — evoluir para multi-stage quando for para produção real
# Node >=22: vitest 5 / jsdom 30 (harness de teste) não rodam em Node 20 (ver ci.yml).
FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]

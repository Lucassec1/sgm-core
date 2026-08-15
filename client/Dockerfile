# Dockerfile simples para desenvolvimento — evoluir para multi-stage quando for para produção real
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]

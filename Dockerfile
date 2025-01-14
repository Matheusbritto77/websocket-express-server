# Etapa 1: Construção do Frontend
FROM node:18 AS build-frontend

# Definindo diretório de trabalho
WORKDIR /app/frontend

# Garantir que o contêiner utilize o usuário root
USER root

# Copiar os arquivos do frontend para o contêiner
COPY ./frontend/package*.json ./
COPY ./frontend/ ./

# Instalando dependências do frontend
RUN npm ci

# Garantir permissão de execução para o diretório de node_modules
RUN chmod -R +x ./node_modules/.bin

# Construir o frontend
RUN npm run build

# Etapa 2: Construção do Backend (Express)
FROM node:18 AS build-backend

# Definindo diretório de trabalho
WORKDIR /app/backend

# Garantir que o contêiner utilize o usuário root
USER root

# Copiar os arquivos do backend para o contêiner
COPY ./backend/package*.json ./
COPY ./backend/ ./

# Instalando dependências do backend
RUN npm ci

# Etapa 3: Imagem Final para Execução
FROM node:18

# Garantir que o contêiner utilize o usuário root
USER root

# Copiar os arquivos do frontend e backend para o contêiner final
COPY --from=build-frontend /app/frontend/dist /app/frontend/dist
COPY --from=build-backend /app/backend /app/backend

# Definindo diretório de trabalho para o servidor
WORKDIR /app/backend

# Expondo a porta em que o servidor Express estará rodando
EXPOSE 3000

# Definir variável de ambiente para o modo de produção
ENV NODE_ENV=production

# Instalar dependências do backend (caso não tenha sido feito na etapa anterior)
RUN npm install --only=production

# Garantir permissão de execução para os arquivos do backend
RUN chmod -R +x /app/backend

# Iniciar o servidor Express
CMD ["node", "server.js"]

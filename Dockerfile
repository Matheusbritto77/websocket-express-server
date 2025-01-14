# Etapa 1: Construção do Frontend
FROM node:18 AS build-frontend

# Definindo diretório de trabalho
WORKDIR /app

# Copiar os arquivos do projeto para o contêiner
COPY package*.json ./

# Instalando dependências do projeto
RUN npm install

# Conceder permissões de execução para arquivos necessários (incluindo vue-tsc)
RUN chmod -R 777 ./node_modules && chmod +x ./node_modules/.bin/vue-tsc

# Copiar todos os arquivos do projeto para o contêiner
COPY . .

# Garantir que todos os arquivos tenham permissões de execução
RUN chmod -R 777 /app

# Construir o frontend com Vite
RUN npm run build

# Etapa 2: Imagem Final para Execução
FROM nginx:alpine

# Copiar os arquivos construídos do frontend para o Nginx
COPY --from=build-frontend /app/dist /usr/share/nginx/html

# Garantir permissões adequadas no diretório
RUN chmod -R 777 /usr/share/nginx/html

# Expor a porta 80 para o Nginx
EXPOSE 80

# Iniciar o Nginx com permissões adequadas
CMD ["nginx", "-g", "daemon off;"]

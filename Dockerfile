# Etapa 1: Construção do Frontend
FROM node:18 AS build-frontend

# Definindo diretório de trabalho
WORKDIR /app

# Copiar os arquivos do projeto para o contêiner
COPY package*.json ./

# Instalando dependências do projeto
RUN npm install

# Copiar todos os arquivos do projeto para o contêiner
COPY . .

# Construir o frontend com Vite
RUN npm run build

# Etapa 2: Imagem Final para Execução
FROM nginx:alpine

# Copiar os arquivos construídos do frontend para o Nginx
COPY --from=build-frontend /app/dist /usr/share/nginx/html

# Expor a porta 80 para o Nginx
EXPOSE 80

# Iniciar o Nginx
CMD ["nginx", "-g", "daemon off;"]

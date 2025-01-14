# Usar uma imagem base do Node.js
FROM node:20

# Definir o diretório de trabalho dentro do container
WORKDIR /app

# Copiar os arquivos de código do projeto para o diretório de trabalho no container
COPY . /app

# Instalar dependências
RUN npm install

# Expor a porta 80 para permitir acesso externo
EXPOSE 80

# Definir o comando para rodar o servidor na porta 80
CMD ["node", "server.js"]

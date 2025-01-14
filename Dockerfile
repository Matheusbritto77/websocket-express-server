# Use uma imagem oficial do PHP com suporte para CLI
FROM php:8.2-cli

# Atualizar e instalar dependências necessárias para o Swoole
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libcurl4-openssl-dev \
    pkg-config \
    libssl-dev \
    && pecl channel-update pecl.php.net \
    && pecl install swoole \
    && docker-php-ext-enable swoole

# Limpar o cache do apt para reduzir o tamanho da imagem
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Definir o diretório de trabalho
WORKDIR /app

# Copiar os arquivos do projeto para o contêiner
COPY . .

# Expor a porta usada pelo Swoole
EXPOSE 9501

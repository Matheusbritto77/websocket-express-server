FROM php:8.2-cli

# Instalar dependências necessárias
RUN apt-get update && apt-get install -y \
    libcurl4-openssl-dev \
    pkg-config \
    libssl-dev \
    git \
    unzip \
    && pecl install swoole \
    && docker-php-ext-enable swoole openssl

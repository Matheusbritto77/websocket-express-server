FROM php:8.2-cli

RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libcurl4-openssl-dev \
    pkg-config \
    libssl-dev \
    libbrotli-dev \
    && pecl channel-update pecl.php.net \
    && pecl install swoole \
    && docker-php-ext-enable swoole

RUN apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

EXPOSE 9501

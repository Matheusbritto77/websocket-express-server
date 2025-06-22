require('dotenv').config();

const config = {
    redis: {
        internal: {
            host: process.env.REDIS_HOST || 'wppapi-socketdestroyer2d-zj6f2i',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD || 'Setcel2@@',
            username: process.env.REDIS_USER || 'default',
            url: process.env.REDIS_URL || 'redis://default:Setcel2@@@wppapi-socketdestroyer2d-zj6f2i:6379'
        },
        external: {
            host: process.env.REDIS_EXTERNAL_HOST || '168.231.95.211',
            port: process.env.REDIS_EXTERNAL_PORT || 6379,
            url: process.env.REDIS_EXTERNAL_URL || 'redis://default:Setcel2@@@168.231.95.211:6379'
        }
    },
    mongodb: {
        internal: {
            host: process.env.MONGO_HOST || 'wppapi-mongosocket-i3h6nj',
            port: process.env.MONGO_PORT || 27017,
            username: process.env.MONGO_USER || 'mongo',
            password: process.env.MONGO_PASSWORD || 'Setcel2@@',
            url: process.env.MONGO_URL || 'mongodb://mongo:Setcel2%40%40@wppapi-mongosocket-i3h6nj:27017'
        },
        external: {
            host: process.env.MONGO_EXTERNAL_HOST || '168.231.95.211',
            port: process.env.MONGO_EXTERNAL_PORT || 27017,
            url: process.env.MONGO_EXTERNAL_URL || 'mongodb://mongo:Setcel2%40%40@168.231.95.211:27017'
        }
    },
    app: {
        port: process.env.PORT || 3333,
        host: process.env.HOST || '127.0.0.1',
        nodeEnv: process.env.NODE_ENV || 'development'
    }
};

module.exports = config; 
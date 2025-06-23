const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

class PostgreSQLService {
    constructor() {
        this.pool = null;
    }

    async initialize() {
        try {
            console.log('🔄 Inicializando PostgreSQL Service...');
            
            // Tentar diferentes configurações de SSL
            const sslConfigs = [
                false, // Sem SSL
                { rejectUnauthorized: false }, // SSL com certificado não verificado
                { rejectUnauthorized: false, sslmode: 'require' } // SSL requerido
            ];

            let lastError = null;

            for (const sslConfig of sslConfigs) {
                try {
                    console.log(`🔗 Tentando conexão PostgreSQL com SSL: ${JSON.stringify(sslConfig)}`);
                    
                    this.pool = new Pool({
                        host: process.env.PG_EXTERNAL_HOST || '168.231.95.211',
                        port: process.env.PG_EXTERNAL_PORT || 5432,
                        database: process.env.PG_DATABASE || 'postgresSocket',
                        user: process.env.PG_USER || 'PostgresSocker2D@',
                        password: process.env.PG_PASSWORD || 'Setcel2@@',
                        ssl: sslConfig
                    });

                    // Testar conexão
                    await this.pool.query('SELECT NOW()');
                    console.log('✅ PostgreSQL Service conectado com sucesso');
                    
                    // Criar tabelas se não existirem
                    await this.createTables();
                    console.log('✅ Tabelas PostgreSQL criadas/verificadas');
                    return; // Sucesso, sair do loop
                    
                } catch (error) {
                    lastError = error;
                    console.log(`❌ Falha na tentativa com SSL ${JSON.stringify(sslConfig)}:`, error.message);
                    
                    // Fechar pool se existir
                    if (this.pool) {
                        await this.pool.end();
                        this.pool = null;
                    }
                }
            }

            // Se chegou aqui, todas as tentativas falharam
            throw lastError || new Error('Não foi possível conectar ao PostgreSQL');
            
        } catch (error) {
            console.error('❌ Erro ao inicializar PostgreSQL Service:', error);
            throw error;
        }
    }

    async createTables() {
        try {
            // Tabela de usuários
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP,
                    is_active BOOLEAN DEFAULT TRUE,
                    profile_data JSONB DEFAULT '{}'
                )
            `);

            // Tabela de sessões
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS sessions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    session_token VARCHAR(255) UNIQUE NOT NULL,
                    socket_id VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP NOT NULL,
                    is_active BOOLEAN DEFAULT TRUE,
                    user_agent TEXT,
                    ip_address INET
                )
            `);

            // Tabela de histórico de login
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS login_history (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    ip_address INET,
                    user_agent TEXT,
                    success BOOLEAN NOT NULL,
                    failure_reason VARCHAR(255)
                )
            `);

            // Índices para performance
            await this.pool.query(`
                CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
                CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
                CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
                CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
                CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
                CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
                CREATE INDEX IF NOT EXISTS idx_login_history_login_at ON login_history(login_at);
            `);

        } catch (error) {
            console.error('❌ Erro ao criar tabelas PostgreSQL:', error);
            throw error;
        }
    }

    // Métodos de usuário
    async createUser(username, email, password) {
        try {
            // Verificar se usuário já existe
            const existingUser = await this.pool.query(
                'SELECT id FROM users WHERE username = $1 OR email = $2',
                [username, email]
            );

            if (existingUser.rows.length > 0) {
                throw new Error('Usuário ou email já existe');
            }

            // Hash da senha
            const saltRounds = 12;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            // Inserir usuário
            const result = await this.pool.query(
                `INSERT INTO users (username, email, password_hash) 
                 VALUES ($1, $2, $3) 
                 RETURNING id, username, email, created_at`,
                [username, email, passwordHash]
            );

            return result.rows[0];
        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            throw error;
        }
    }

    async authenticateUser(usernameOrEmail, password) {
        try {
            // Buscar usuário por username ou email
            const result = await this.pool.query(
                'SELECT id, username, email, password_hash, is_active FROM users WHERE username = $1 OR email = $1',
                [usernameOrEmail]
            );

            if (result.rows.length === 0) {
                return null;
            }

            const user = result.rows[0];

            if (!user.is_active) {
                throw new Error('Conta desativada');
            }

            // Verificar senha
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            if (!isValidPassword) {
                return null;
            }

            // Atualizar último login
            await this.pool.query(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
                [user.id]
            );

            return {
                id: user.id,
                username: user.username,
                email: user.email
            };
        } catch (error) {
            console.error('Erro ao autenticar usuário:', error);
            throw error;
        }
    }

    async getUserById(userId) {
        try {
            const result = await this.pool.query(
                'SELECT id, username, email, created_at, last_login, profile_data FROM users WHERE id = $1 AND is_active = TRUE',
                [userId]
            );

            return result.rows[0] || null;
        } catch (error) {
            console.error('Erro ao buscar usuário:', error);
            throw error;
        }
    }

    async updateUserProfile(userId, profileData) {
        try {
            const result = await this.pool.query(
                `UPDATE users 
                 SET profile_data = $1, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $2 
                 RETURNING id, username, email, profile_data`,
                [JSON.stringify(profileData), userId]
            );

            return result.rows[0];
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            throw error;
        }
    }

    // Métodos de sessão
    async createSession(userId, socketId, userAgent, ipAddress) {
        try {
            // Gerar token de sessão
            const sessionToken = crypto.randomBytes(32).toString('hex');
            
            // Expira em 30 dias
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);

            const result = await this.pool.query(
                `INSERT INTO sessions (user_id, session_token, socket_id, expires_at, user_agent, ip_address) 
                 VALUES ($1, $2, $3, $4, $5, $6) 
                 RETURNING session_token`,
                [userId, sessionToken, socketId, expiresAt, userAgent, ipAddress]
            );

            return result.rows[0].session_token;
        } catch (error) {
            console.error('Erro ao criar sessão:', error);
            throw error;
        }
    }

    async validateSession(sessionToken) {
        try {
            const result = await this.pool.query(
                `SELECT s.user_id, s.socket_id, u.username, u.email 
                 FROM sessions s 
                 JOIN users u ON s.user_id = u.id 
                 WHERE s.session_token = $1 
                 AND s.expires_at > CURRENT_TIMESTAMP 
                 AND s.is_active = TRUE 
                 AND u.is_active = TRUE`,
                [sessionToken]
            );

            return result.rows[0] || null;
        } catch (error) {
            console.error('Erro ao validar sessão:', error);
            throw error;
        }
    }

    async invalidateSession(sessionToken) {
        try {
            await this.pool.query(
                'UPDATE sessions SET is_active = FALSE WHERE session_token = $1',
                [sessionToken]
            );
        } catch (error) {
            console.error('Erro ao invalidar sessão:', error);
            throw error;
        }
    }

    async invalidateUserSessions(userId) {
        try {
            await this.pool.query(
                'UPDATE sessions SET is_active = FALSE WHERE user_id = $1',
                [userId]
            );
        } catch (error) {
            console.error('Erro ao invalidar sessões do usuário:', error);
            throw error;
        }
    }

    // Métodos de histórico
    async logLoginAttempt(userId, ipAddress, userAgent, success, failureReason = null) {
        try {
            await this.pool.query(
                `INSERT INTO login_history (user_id, ip_address, user_agent, success, failure_reason) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [userId, ipAddress, userAgent, success, failureReason]
            );
        } catch (error) {
            console.error('Erro ao registrar tentativa de login:', error);
        }
    }

    async getLoginHistory(userId, limit = 10) {
        try {
            const result = await this.pool.query(
                `SELECT login_at, ip_address, user_agent, success, failure_reason 
                 FROM login_history 
                 WHERE user_id = $1 
                 ORDER BY login_at DESC 
                 LIMIT $2`,
                [userId, limit]
            );

            return result.rows;
        } catch (error) {
            console.error('Erro ao buscar histórico de login:', error);
            throw error;
        }
    }

    // Limpeza de dados expirados
    async cleanupExpiredSessions() {
        try {
            const result = await this.pool.query(
                'DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP'
            );
            console.log(`🧹 Limpeza: ${result.rowCount} sessões expiradas removidas`);
        } catch (error) {
            console.error('Erro ao limpar sessões expiradas:', error);
        }
    }

    async close() {
        if (this.pool) {
            await this.pool.end();
        }
    }
}

module.exports = new PostgreSQLService(); 
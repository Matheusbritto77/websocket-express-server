const databaseManager = require('../config/database');

class PostgreSQLService {
    constructor() {
        this.pool = null;
        this.initialize();
    }

    async initialize() {
        this.pool = databaseManager.getPostgresPool();
        if (!this.pool) {
            await databaseManager.connectPostgreSQL();
            this.pool = databaseManager.getPostgresPool();
        }
        
        // Criar tabelas se não existirem
        await this.createTables();
    }

    async createTables() {
        try {
            const client = await this.pool.connect();
            
            // Tabela de usuários registrados (para futuras funcionalidades)
            await client.query(`
                CREATE TABLE IF NOT EXISTS registered_users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP,
                    is_active BOOLEAN DEFAULT TRUE,
                    profile_data JSONB
                )
            `);

            // Tabela de sessões
            await client.query(`
                CREATE TABLE IF NOT EXISTS user_sessions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES registered_users(id),
                    session_token VARCHAR(255) UNIQUE NOT NULL,
                    socket_id VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP NOT NULL,
                    is_active BOOLEAN DEFAULT TRUE
                )
            `);

            // Tabela de logs de atividade
            await client.query(`
                CREATE TABLE IF NOT EXISTS activity_logs (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES registered_users(id),
                    activity_type VARCHAR(50) NOT NULL,
                    description TEXT,
                    ip_address INET,
                    user_agent TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    metadata JSONB
                )
            `);

            // Tabela de configurações do sistema
            await client.query(`
                CREATE TABLE IF NOT EXISTS system_config (
                    id SERIAL PRIMARY KEY,
                    config_key VARCHAR(100) UNIQUE NOT NULL,
                    config_value TEXT,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Tabela de relatórios
            await client.query(`
                CREATE TABLE IF NOT EXISTS reports (
                    id SERIAL PRIMARY KEY,
                    reporter_id INTEGER REFERENCES registered_users(id),
                    reported_user_id INTEGER REFERENCES registered_users(id),
                    report_type VARCHAR(50) NOT NULL,
                    description TEXT,
                    evidence JSONB,
                    status VARCHAR(20) DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    resolved_at TIMESTAMP,
                    resolved_by INTEGER REFERENCES registered_users(id)
                )
            `);

            // Inserir configurações padrão do sistema
            await client.query(`
                INSERT INTO system_config (config_key, config_value, description) 
                VALUES 
                    ('max_users_per_room', '2', 'Número máximo de usuários por sala'),
                    ('chat_timeout_minutes', '30', 'Tempo limite de inatividade em minutos'),
                    ('max_message_length', '1000', 'Tamanho máximo de mensagem'),
                    ('rate_limit_messages_per_minute', '60', 'Limite de mensagens por minuto'),
                    ('maintenance_mode', 'false', 'Modo de manutenção do sistema')
                ON CONFLICT (config_key) DO NOTHING
            `);

            client.release();
            console.log('✅ Tabelas PostgreSQL criadas/verificadas com sucesso');
        } catch (error) {
            console.error('❌ Erro ao criar tabelas PostgreSQL:', error);
        }
    }

    // Métodos para usuários registrados
    async createUser(username, email, passwordHash, profileData = {}) {
        try {
            const client = await this.pool.connect();
            const result = await client.query(`
                INSERT INTO registered_users (username, email, password_hash, profile_data)
                VALUES ($1, $2, $3, $4)
                RETURNING id, username, email, created_at
            `, [username, email, passwordHash, JSON.stringify(profileData)]);
            
            client.release();
            return result.rows[0];
        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            throw error;
        }
    }

    async findUserByEmail(email) {
        try {
            const client = await this.pool.connect();
            const result = await client.query(`
                SELECT * FROM registered_users WHERE email = $1 AND is_active = TRUE
            `, [email]);
            
            client.release();
            return result.rows[0];
        } catch (error) {
            console.error('Erro ao buscar usuário por email:', error);
            throw error;
        }
    }

    async findUserById(id) {
        try {
            const client = await this.pool.connect();
            const result = await client.query(`
                SELECT * FROM registered_users WHERE id = $1 AND is_active = TRUE
            `, [id]);
            
            client.release();
            return result.rows[0];
        } catch (error) {
            console.error('Erro ao buscar usuário por ID:', error);
            throw error;
        }
    }

    // Métodos para sessões
    async createSession(userId, sessionToken, socketId, expiresAt) {
        try {
            const client = await this.pool.connect();
            const result = await client.query(`
                INSERT INTO user_sessions (user_id, session_token, socket_id, expires_at)
                VALUES ($1, $2, $3, $4)
                RETURNING id, session_token, expires_at
            `, [userId, sessionToken, socketId, expiresAt]);
            
            client.release();
            return result.rows[0];
        } catch (error) {
            console.error('Erro ao criar sessão:', error);
            throw error;
        }
    }

    async findSessionByToken(sessionToken) {
        try {
            const client = await this.pool.connect();
            const result = await client.query(`
                SELECT s.*, u.username, u.email 
                FROM user_sessions s
                JOIN registered_users u ON s.user_id = u.id
                WHERE s.session_token = $1 AND s.is_active = TRUE AND s.expires_at > CURRENT_TIMESTAMP
            `, [sessionToken]);
            
            client.release();
            return result.rows[0];
        } catch (error) {
            console.error('Erro ao buscar sessão:', error);
            throw error;
        }
    }

    async invalidateSession(sessionToken) {
        try {
            const client = await this.pool.connect();
            await client.query(`
                UPDATE user_sessions 
                SET is_active = FALSE 
                WHERE session_token = $1
            `, [sessionToken]);
            
            client.release();
            return true;
        } catch (error) {
            console.error('Erro ao invalidar sessão:', error);
            throw error;
        }
    }

    // Métodos para logs de atividade
    async logActivity(userId, activityType, description, ipAddress, userAgent, metadata = {}) {
        try {
            const client = await this.pool.connect();
            await client.query(`
                INSERT INTO activity_logs (user_id, activity_type, description, ip_address, user_agent, metadata)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [userId, activityType, description, ipAddress, userAgent, JSON.stringify(metadata)]);
            
            client.release();
            return true;
        } catch (error) {
            console.error('Erro ao registrar atividade:', error);
            return false;
        }
    }

    async getActivityLogs(userId, limit = 50, offset = 0) {
        try {
            const client = await this.pool.connect();
            const result = await client.query(`
                SELECT * FROM activity_logs 
                WHERE user_id = $1 
                ORDER BY created_at DESC 
                LIMIT $2 OFFSET $3
            `, [userId, limit, offset]);
            
            client.release();
            return result.rows;
        } catch (error) {
            console.error('Erro ao buscar logs de atividade:', error);
            return [];
        }
    }

    // Métodos para configurações do sistema
    async getSystemConfig(configKey) {
        try {
            const client = await this.pool.connect();
            const result = await client.query(`
                SELECT config_value FROM system_config WHERE config_key = $1
            `, [configKey]);
            
            client.release();
            return result.rows[0]?.config_value;
        } catch (error) {
            console.error('Erro ao buscar configuração:', error);
            return null;
        }
    }

    async setSystemConfig(configKey, configValue, description = null) {
        try {
            const client = await this.pool.connect();
            await client.query(`
                INSERT INTO system_config (config_key, config_value, description)
                VALUES ($1, $2, $3)
                ON CONFLICT (config_key) 
                DO UPDATE SET 
                    config_value = EXCLUDED.config_value,
                    description = COALESCE(EXCLUDED.description, system_config.description),
                    updated_at = CURRENT_TIMESTAMP
            `, [configKey, configValue, description]);
            
            client.release();
            return true;
        } catch (error) {
            console.error('Erro ao definir configuração:', error);
            return false;
        }
    }

    // Métodos para relatórios
    async createReport(reporterId, reportedUserId, reportType, description, evidence = {}) {
        try {
            const client = await this.pool.connect();
            const result = await client.query(`
                INSERT INTO reports (reporter_id, reported_user_id, report_type, description, evidence)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id, created_at
            `, [reporterId, reportedUserId, reportType, description, JSON.stringify(evidence)]);
            
            client.release();
            return result.rows[0];
        } catch (error) {
            console.error('Erro ao criar relatório:', error);
            throw error;
        }
    }

    async getReports(status = null, limit = 50, offset = 0) {
        try {
            const client = await this.pool.connect();
            let query = `
                SELECT r.*, 
                       u1.username as reporter_username,
                       u2.username as reported_username
                FROM reports r
                JOIN registered_users u1 ON r.reporter_id = u1.id
                JOIN registered_users u2 ON r.reported_user_id = u2.id
            `;
            
            const params = [];
            if (status) {
                query += ' WHERE r.status = $1';
                params.push(status);
            }
            
            query += ' ORDER BY r.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
            params.push(limit, offset);
            
            const result = await client.query(query, params);
            client.release();
            return result.rows;
        } catch (error) {
            console.error('Erro ao buscar relatórios:', error);
            return [];
        }
    }

    // Health check
    async healthCheck() {
        try {
            const client = await this.pool.connect();
            await client.query('SELECT 1');
            client.release();
            return true;
        } catch (error) {
            console.error('PostgreSQL health check falhou:', error);
            return false;
        }
    }

    // Estatísticas
    async getDatabaseStats() {
        try {
            const client = await this.pool.connect();
            
            const stats = {};
            
            // Contagem de usuários
            const userCount = await client.query('SELECT COUNT(*) FROM registered_users WHERE is_active = TRUE');
            stats.activeUsers = parseInt(userCount.rows[0].count);
            
            // Contagem de sessões ativas
            const sessionCount = await client.query('SELECT COUNT(*) FROM user_sessions WHERE is_active = TRUE AND expires_at > CURRENT_TIMESTAMP');
            stats.activeSessions = parseInt(sessionCount.rows[0].count);
            
            // Contagem de relatórios pendentes
            const reportCount = await client.query('SELECT COUNT(*) FROM reports WHERE status = \'pending\'');
            stats.pendingReports = parseInt(reportCount.rows[0].count);
            
            client.release();
            return stats;
        } catch (error) {
            console.error('Erro ao obter estatísticas do banco:', error);
            return {};
        }
    }
}

module.exports = new PostgreSQLService(); 
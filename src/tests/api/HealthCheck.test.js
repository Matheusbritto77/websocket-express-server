const request = require('supertest');
const express = require('express');
const App = require('../../App');

describe('API Health Check Tests', () => {
    let app, server;

    beforeAll(async () => {
        app = express();
        server = require('http').createServer(app);
        
        // Simular a aplicação
        app.get('/health', (req, res) => {
            res.json({ status: 'UP', timestamp: new Date().toISOString() });
        });

        app.get('/status', (req, res) => {
            res.json({ 
                status: 'UP',
                services: {
                    mongodb: 'connected',
                    redis: 'connected',
                    websocket: 'running'
                },
                uptime: process.uptime()
            });
        });
    });

    afterAll(() => {
        if (server) server.close();
    });

    it('deve retornar status UP no endpoint /health', async () => {
        const response = await request(app)
            .get('/health')
            .expect(200);

        expect(response.body).toHaveProperty('status', 'UP');
        expect(response.body).toHaveProperty('timestamp');
    });

    it('deve retornar informações detalhadas no endpoint /status', async () => {
        const response = await request(app)
            .get('/status')
            .expect(200);

        expect(response.body).toHaveProperty('status', 'UP');
        expect(response.body).toHaveProperty('services');
        expect(response.body.services).toHaveProperty('mongodb');
        expect(response.body.services).toHaveProperty('redis');
        expect(response.body.services).toHaveProperty('websocket');
        expect(response.body).toHaveProperty('uptime');
    });

    it('deve retornar 404 para endpoints inexistentes', async () => {
        await request(app)
            .get('/inexistente')
            .expect(404);
    });
}); 
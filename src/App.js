const express = require('express');
const http = require('http');
const app = express();

// Agora instanciamos o SocketService corretamente com 'new'
const SocketService = require('./SocketService');

class App {
    constructor(port) {
        this.port = port ? port : 443;
    }

    start() {
        app.get('/health', (req, res) => {
            res.send({
                status: 'UP'
            });
        });

        app.use(express.static('public'));

        // Criando o servidor HTTP
        const server = http.createServer(app);

        // Instanciando o SocketService corretamente
        new SocketService(server);

        // Iniciando o servidor na porta definida
        server.listen(this.port, () => {
            console.log(`Server is running at port: ${this.port}`);
        });
    }
}

module.exports = (port) => {
    return new App(port);
};

const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*", // ou sua URL
        methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling'], // Compatibilidade com transporte
    allowEIO3: true // Garantir compatibilidade com a versão EIO 3
});

// Importando o serviço de socket
require('./SocketService')(http);

class App {
    constructor(port) {
        this.port = port || 443;
    }

    start() {
        app.get('/health', (req, res) => {
            res.send({
                status: 'UP'
            });
        });

        // Servindo arquivos estáticos
        app.use(express.static('public'));

        // Inicializando o servidor
        http.listen(this.port, () => {
            console.log(`Server up at port: ${this.port}`);
        });
    }
}

module.exports = (port) => {
    return new App(port);
};

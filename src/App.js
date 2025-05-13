const express = require('express')
const app = express()
const http = require('http').createServer(app)
require('./SocketService')(http)

class App {
    constructor(port, host) {
        this.port = port || 443
        this.host = host || '0.0.0.0' // aceita conexões externas na rede local
    }

    start() {
        app.get('/health', (req, res) => {
            res.send({ status: 'UP' })
        })

        app.use(express.static('public'))

        http.listen(this.port, this.host, () => {
            console.log(`✅ Server up at http://${this.host}:${this.port}`)
        })
    }
}

module.exports = (port, host) => {
    return new App(port, host)
}

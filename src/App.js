const express = require('express')
const app = express()
const http = require('http').createServer(app)

app.get('/health', (req, res) => {
    res.send({ status: 'UP' })
})

app.use(express.static('public'))

const PORT = process.env.PORT || 3333
http.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor ouvindo na porta ${PORT}`)
})

const express = require('express');
const path = require('path');
const app = express();

// Porta do servidor
const PORT = 3000;

// Middleware para servir o frontend
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// API de exemplo
app.get('/api', (req, res) => {
    res.json({ message: 'API funcionando!' });
});

// Rota para o frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
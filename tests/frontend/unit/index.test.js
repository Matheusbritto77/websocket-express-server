import { fireEvent, waitFor } from '@testing-library/dom';
import '@testing-library/jest-dom';

// Mock das funções globais
global.showLoading = jest.fn();
global.showForm = jest.fn();
global.showPlayers = jest.fn();
global.showFail = jest.fn();
global.setLocalPlayerStream = jest.fn();
global.createPeer = jest.fn();
global.createOffer = jest.fn();
global.answerPeer = jest.fn();
global.User = jest.fn().mockImplementation((id) => ({
    id,
    pc: null,
    player: null,
    dc: null,
    selfDestroy: jest.fn(),
    sendMessage: jest.fn()
}));

// Mock do socket
let mockSocket;

beforeEach(() => {
    // Limpa as variáveis globais
    global.socket = null;
    global.myStream = { getTracks: jest.fn() };
    global.users = new Map();
    global.isInQueue = false;
    global.currentRoomId = null;

    // Mock do socket
    mockSocket = {
        on: jest.fn(),
        emit: jest.fn(),
        connect: jest.fn(),
        close: jest.fn(),
        connected: true
    };
    global.io = jest.fn().mockReturnValue(mockSocket);

    // Setup do DOM
    document.body.innerHTML = `
        <form id="roomForm">
            <input type="text" id="username" value="TestUser">
            <button type="submit">Entrar na Fila</button>
        </form>
        <form id="chatForm">
            <input type="text" id="inputChatMessage" value="Test message">
            <button type="submit">Enviar</button>
        </form>
        <button id="leave">Sair</button>
        <button id="nextButton">Próximo</button>
        <div id="loading" style="display: none;"></div>
        <div id="message-printer"></div>
    `;
});

describe('Frontend - index.js', () => {
    describe('Inicialização', () => {
        it('deve configurar event listeners no DOMContentLoaded', async () => {
            // Simula o evento DOMContentLoaded
            const event = new Event('DOMContentLoaded');
            document.dispatchEvent(event);

            await waitFor(() => {
                expect(global.io).toHaveBeenCalled();
            });
        });

        it('deve configurar getUserMedia com sucesso', async () => {
            const getUserMediaSpy = jest.spyOn(navigator.mediaDevices, 'getUserMedia');
            
            // Simula o evento DOMContentLoaded
            const event = new Event('DOMContentLoaded');
            document.dispatchEvent(event);

            await waitFor(() => {
                expect(getUserMediaSpy).toHaveBeenCalledWith({
                    video: { height: 480, width: 640 },
                    audio: true
                });
            });
        });

        it('deve mostrar erro quando getUserMedia falha', async () => {
            const getUserMediaSpy = jest.spyOn(navigator.mediaDevices, 'getUserMedia')
                .mockRejectedValue(new Error('Permission denied'));

            // Simula o evento DOMContentLoaded
            const event = new Event('DOMContentLoaded');
            document.dispatchEvent(event);

            await waitFor(() => {
                expect(global.showFail).toHaveBeenCalled();
            });
        });
    });

    describe('Formulário de entrada', () => {
        it('deve prevenir envio padrão do formulário', async () => {
            const form = document.getElementById('roomForm');
            const submitEvent = new Event('submit');
            
            fireEvent(form, submitEvent);

            expect(submitEvent.defaultPrevented).toBe(true);
        });

        it('deve chamar showLoading e initServerConnection no submit', async () => {
            const form = document.getElementById('roomForm');
            
            fireEvent.submit(form);

            expect(global.showLoading).toHaveBeenCalled();
        });
    });

    describe('Sistema de filas', () => {
        beforeEach(() => {
            global.socket = mockSocket;
        });

        it('deve entrar na fila automaticamente ao conectar', () => {
            // Simula evento de conexão
            const connectCallback = mockSocket.on.mock.calls.find(call => call[0] === 'connect')[1];
            connectCallback();

            expect(mockSocket.emit).toHaveBeenCalledWith('join-queue', {
                username: expect.any(String)
            });
        });

        it('deve usar nome do usuário do formulário', () => {
            const usernameInput = document.getElementById('username');
            usernameInput.value = 'João Silva';

            // Simula evento de conexão
            const connectCallback = mockSocket.on.mock.calls.find(call => call[0] === 'connect')[1];
            connectCallback();

            expect(mockSocket.emit).toHaveBeenCalledWith('join-queue', {
                username: 'João Silva'
            });
        });

        it('deve gerar nome automático quando campo está vazio', () => {
            const usernameInput = document.getElementById('username');
            usernameInput.value = '';

            // Simula evento de conexão
            const connectCallback = mockSocket.on.mock.calls.find(call => call[0] === 'connect')[1];
            connectCallback();

            expect(mockSocket.emit).toHaveBeenCalledWith('join-queue', {
                username: expect.stringMatching(/^Usuário_[a-zA-Z0-9]{5}$/)
            });
        });
    });

    describe('Eventos do matchmaking', () => {
        beforeEach(() => {
            global.socket = mockSocket;
        });

        it('deve processar evento queue-update', () => {
            const queueUpdateCallback = mockSocket.on.mock.calls.find(call => call[0] === 'queue-update')[1];
            
            queueUpdateCallback({
                queue: 'A',
                position: 3,
                estimatedWait: 45
            });

            expect(global.showLoading).toHaveBeenCalled();
        });

        it('deve processar evento match-found', () => {
            const matchFoundCallback = mockSocket.on.mock.calls.find(call => call[0] === 'match-found')[1];
            
            matchFoundCallback({
                roomId: 'room-123',
                users: [
                    { socketId: 'user1', username: 'João' },
                    { socketId: 'user2', username: 'Maria' },
                    { socketId: 'user3', username: 'Pedro' }
                ]
            });

            expect(global.currentRoomId).toBe('room-123');
            expect(global.isInQueue).toBe(false);
            expect(global.showPlayers).toHaveBeenCalled();
        });

        it('deve processar evento next-requested', () => {
            const nextRequestedCallback = mockSocket.on.mock.calls.find(call => call[0] === 'next-requested')[1];
            
            nextRequestedCallback({ message: 'Próximo usuário solicitado' });

            expect(global.showLoading).toHaveBeenCalled();
        });

        it('deve processar evento queue-left', () => {
            const queueLeftCallback = mockSocket.on.mock.calls.find(call => call[0] === 'queue-left')[1];
            
            queueLeftCallback({ message: 'Saiu da fila' });

            expect(global.isInQueue).toBe(false);
            expect(global.showForm).toHaveBeenCalled();
        });
    });

    describe('Eventos WebRTC', () => {
        beforeEach(() => {
            global.socket = mockSocket;
        });

        it('deve processar evento call com múltiplos usuários', () => {
            const callCallback = mockSocket.on.mock.calls.find(call => call[0] === 'call')[1];
            
            callCallback({
                roomId: 'room-123',
                users: [
                    { socketId: 'user1', username: 'João' },
                    { socketId: 'user2', username: 'Maria' }
                ]
            });

            expect(global.User).toHaveBeenCalledTimes(2);
            expect(global.createPeer).toHaveBeenCalledTimes(2);
            expect(global.createOffer).toHaveBeenCalledTimes(2);
        });

        it('deve processar evento call com fallback para sistema antigo', () => {
            const callCallback = mockSocket.on.mock.calls.find(call => call[0] === 'call')[1];
            
            callCallback({ id: 'user1' });

            expect(global.User).toHaveBeenCalledWith('user1');
            expect(global.createPeer).toHaveBeenCalled();
            expect(global.createOffer).toHaveBeenCalled();
        });

        it('deve processar evento offer', () => {
            const offerCallback = mockSocket.on.mock.calls.find(call => call[0] === 'offer')[1];
            
            // Simula usuário existente
            const mockUser = new global.User('user1');
            global.users.set('user1', mockUser);
            
            offerCallback({
                id: 'user1',
                offer: { sdp: 'mock-offer' }
            });

            expect(global.answerPeer).toHaveBeenCalledWith(mockUser, { sdp: 'mock-offer' }, mockSocket);
        });

        it('deve processar evento answer', () => {
            const answerCallback = mockSocket.on.mock.calls.find(call => call[0] === 'answer')[1];
            
            const mockUser = new global.User('user1');
            mockUser.pc = { setRemoteDescription: jest.fn() };
            global.users.set('user1', mockUser);
            
            answerCallback({
                id: 'user1',
                answer: { sdp: 'mock-answer' }
            });

            expect(mockUser.pc.setRemoteDescription).toHaveBeenCalledWith({ sdp: 'mock-answer' });
        });

        it('deve processar evento candidate', () => {
            const candidateCallback = mockSocket.on.mock.calls.find(call => call[0] === 'candidate')[1];
            
            const mockUser = new global.User('user1');
            mockUser.pc = { addIceCandidate: jest.fn() };
            global.users.set('user1', mockUser);
            
            candidateCallback({
                id: 'user1',
                candidate: { candidate: 'mock-candidate' }
            });

            expect(mockUser.pc.addIceCandidate).toHaveBeenCalledWith({ candidate: 'mock-candidate' });
        });
    });

    describe('Funções de controle', () => {
        beforeEach(() => {
            global.socket = mockSocket;
        });

        it('deve processar envio de mensagem no chat', () => {
            const form = document.getElementById('chatForm');
            const messageInput = document.getElementById('inputChatMessage');
            messageInput.value = 'Olá, mundo!';

            fireEvent.submit(form);

            expect(messageInput.value).toBe('');
        });

        it('deve processar saída da sala', () => {
            global.leaveQueue = jest.fn();
            
            const leaveButton = document.getElementById('leave');
            fireEvent.click(leaveButton);

            expect(global.leaveQueue).toHaveBeenCalled();
            expect(mockSocket.close).toHaveBeenCalled();
        });

        it('deve processar solicitação de próximo usuário', () => {
            const nextButton = document.getElementById('nextButton');
            fireEvent.click(nextButton);

            expect(mockSocket.emit).toHaveBeenCalledWith('next');
            expect(global.showLoading).toHaveBeenCalled();
        });
    });

    describe('Funções utilitárias', () => {
        it('deve atualizar mensagem de loading', () => {
            document.body.innerHTML = '<div id="loading"></div>';
            
            global.updateLoadingMessage('Testando...');
            
            const statusElement = document.querySelector('.status-message');
            expect(statusElement).toBeInTheDocument();
            expect(statusElement.textContent).toBe('Testando...');
        });

        it('deve atualizar status da sala', () => {
            document.body.innerHTML = '<div id="room-status">🎯 Sala Ativa</div>';
            
            global.updateRoomStatus({
                roomId: 'room-123',
                users: [
                    { socketId: 'user1', username: 'João' },
                    { socketId: 'user2', username: 'Maria' }
                ]
            });
            
            const statusElement = document.getElementById('room-status');
            expect(statusElement.innerHTML).toBe('🎯 Sala: 3 usuários');
            expect(statusElement.title).toBe('Sala: room-123');
        });
    });
}); 
import { fireEvent } from '@testing-library/dom';
import '@testing-library/jest-dom';

describe('Integração - Matchmaking fila', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="loading"></div>
        `;
        global.showLoading = jest.fn();
        global.updateLoadingMessage = jest.fn();
        global.io = jest.fn().mockReturnValue({
            on: jest.fn(),
            emit: jest.fn(),
            connected: true
        });
        global.socket = global.io();
    });

    it('deve mostrar posição na fila ao receber queue-update', () => {
        require('../../../public/js/index.js');
        // Simula evento do socket
        const queueUpdateCallback = global.socket.on.mock.calls.find(call => call[0] === 'queue-update')[1];
        queueUpdateCallback({ queue: 'A', position: 2, estimatedWait: 30 });
        expect(global.showLoading).toHaveBeenCalled();
        expect(global.updateLoadingMessage).toHaveBeenCalledWith(expect.stringMatching(/Posição: 2/));
    });

    it('deve mostrar tela de players ao receber match-found', () => {
        global.showPlayers = jest.fn();
        require('../../../public/js/index.js');
        const matchFoundCallback = global.socket.on.mock.calls.find(call => call[0] === 'match-found')[1];
        matchFoundCallback({ roomId: 'room-abc', users: [{ socketId: 'a' }, { socketId: 'b' }] });
        expect(global.showPlayers).toHaveBeenCalled();
    });
}); 
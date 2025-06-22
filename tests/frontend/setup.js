// Setup para testes do frontend
import '@testing-library/jest-dom';

// Mock do WebRTC
global.RTCPeerConnection = jest.fn().mockImplementation(() => ({
    createOffer: jest.fn().mockResolvedValue({ sdp: 'mock-offer-sdp' }),
    createAnswer: jest.fn().mockResolvedValue({ sdp: 'mock-answer-sdp' }),
    setLocalDescription: jest.fn().mockResolvedValue(),
    setRemoteDescription: jest.fn().mockResolvedValue(),
    addIceCandidate: jest.fn(),
    addTrack: jest.fn(),
    createDataChannel: jest.fn().mockReturnValue({
        onopen: null,
        onclose: null,
        onmessage: null,
        send: jest.fn()
    }),
    onicecandidate: null,
    ontrack: null,
    ondatachannel: null
}));

// Mock do getUserMedia
Object.defineProperty(navigator, 'mediaDevices', {
    value: {
        getUserMedia: jest.fn().mockResolvedValue({
            getTracks: jest.fn().mockReturnValue([
                { kind: 'video' },
                { kind: 'audio' }
            ])
        })
    },
    writable: true
});

// Mock do Socket.IO
global.io = jest.fn().mockReturnValue({
    on: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    close: jest.fn(),
    connected: true
});

// Mock do localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock do sessionStorage
const sessionStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};
global.sessionStorage = sessionStorageMock;

// Mock do console para evitar logs nos testes
global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

// Configuração global do JSDOM
global.document.createRange = () => ({
    setStart: () => {},
    setEnd: () => {},
    commonAncestorContainer: {
        nodeName: 'BODY',
        ownerDocument: document,
    },
});

// Mock do ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}));

// Mock do IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}));

// Mock do requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
global.cancelAnimationFrame = jest.fn();

// Mock do fetch
global.fetch = jest.fn();

// Configurações do Jest
jest.setTimeout(10000);

// Limpeza após cada teste
afterEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
}); 
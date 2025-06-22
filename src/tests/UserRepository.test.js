const mongoConnection = require('../infrastructure/mongodb');
const UserRepository = require('../repositories/UserRepository');
const User = require('../models/User');

describe('UserRepository', () => {
    let userRepository;
    let testUser;

    beforeAll(async () => {
        await mongoConnection.connect();
        userRepository = new UserRepository();
        await userRepository.init();
    });

    afterAll(async () => {
        await mongoConnection.disconnect();
    });

    beforeEach(async () => {
        testUser = {
            socketId: 'test-socket-id',
            roomId: 'test-room-id',
            username: 'testuser',
            isOnline: true,
            createdAt: new Date(),
            lastSeen: new Date(),
            connectionData: {}
        };
        await userRepository.createUser(testUser);
    });

    afterEach(async () => {
        await userRepository.deleteUser('test-socket-id');
    });

    it('deve criar um usuário', async () => {
        const user = await userRepository.findUserBySocketId('test-socket-id');
        expect(user).toBeInstanceOf(User);
        expect(user.socketId).toBe('test-socket-id');
    });

    it('deve atualizar um usuário', async () => {
        const updated = await userRepository.updateUser('test-socket-id', { username: 'updateduser' });
        expect(updated).toBe(true);
        const user = await userRepository.findUserBySocketId('test-socket-id');
        expect(user.username).toBe('updateduser');
    });

    it('deve definir usuário como offline', async () => {
        const offline = await userRepository.setUserOffline('test-socket-id');
        expect(offline).toBe(true);
        const user = await userRepository.findUserBySocketId('test-socket-id');
        expect(user.isOnline).toBe(false);
    });

    it('deve deletar um usuário', async () => {
        const deleted = await userRepository.deleteUser('test-socket-id');
        expect(deleted).toBe(true);
        const user = await userRepository.findUserBySocketId('test-socket-id');
        expect(user).toBeNull();
    });
}); 
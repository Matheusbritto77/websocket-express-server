const mongoConnection = require('../infrastructure/mongodb');
const RoomRepository = require('../repositories/RoomRepository');
const Room = require('../models/Room');

describe('RoomRepository', () => {
    let roomRepository;
    let testRoomId = 'test-room-id';

    beforeAll(async () => {
        await mongoConnection.connect();
        roomRepository = new RoomRepository();
        await roomRepository.init();
    });

    afterAll(async () => {
        await mongoConnection.disconnect();
    });

    beforeEach(async () => {
        await roomRepository.createRoom({
            roomId: testRoomId,
            name: 'Sala Teste',
            maxUsers: 2,
            currentUsers: 1,
            isActive: true,
            createdAt: new Date(),
            lastActivity: new Date(),
            settings: { allowVideo: true, allowAudio: true, allowScreenShare: false }
        });
    });

    afterEach(async () => {
        await roomRepository.deleteRoom(testRoomId);
    });

    it('deve criar uma sala', async () => {
        const room = await roomRepository.findRoomById(testRoomId);
        expect(room).toBeInstanceOf(Room);
        expect(room.roomId).toBe(testRoomId);
    });

    it('deve atualizar uma sala', async () => {
        const updated = await roomRepository.updateRoom(testRoomId, { name: 'Nova Sala' });
        expect(updated).toBe(true);
        const room = await roomRepository.findRoomById(testRoomId);
        expect(room.name).toBe('Nova Sala');
    });

    it('deve incrementar e decrementar o número de usuários', async () => {
        const inc = await roomRepository.incrementUserCount(testRoomId);
        expect(inc).toBe(true);
        let room = await roomRepository.findRoomById(testRoomId);
        expect(room.currentUsers).toBe(2);
        const dec = await roomRepository.decrementUserCount(testRoomId);
        expect(dec).toBe(true);
        room = await roomRepository.findRoomById(testRoomId);
        expect(room.currentUsers).toBe(1);
    });

    it('deve desativar uma sala', async () => {
        const deactivated = await roomRepository.deactivateRoom(testRoomId);
        expect(deactivated).toBe(true);
        const room = await roomRepository.findRoomById(testRoomId);
        expect(room.isActive).toBe(false);
    });

    it('deve deletar uma sala', async () => {
        const deleted = await roomRepository.deleteRoom(testRoomId);
        expect(deleted).toBe(true);
        const room = await roomRepository.findRoomById(testRoomId);
        expect(room).toBeNull();
    });
}); 
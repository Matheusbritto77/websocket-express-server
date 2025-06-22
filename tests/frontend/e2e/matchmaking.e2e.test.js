const puppeteer = require('puppeteer');

describe('E2E - Matchmaking Frontend', () => {
    let browser, page;
    beforeAll(async () => {
        browser = await puppeteer.launch({ headless: true });
        page = await browser.newPage();
        await page.goto('http://localhost:3000');
    });
    afterAll(async () => {
        await browser.close();
    });

    it('Mostra tela de loading ao entrar na fila', async () => {
        await page.type('#username', 'TesteE2E');
        await page.click('button[type=submit]');
        await page.waitForSelector('#loading', { visible: true });
        const text = await page.$eval('#loading', el => el.textContent);
        expect(text).toMatch(/Procurando Usuários/);
    });

    it('Mostra indicador de sala ao receber match', async () => {
        // Simula recebimento de match-found
        await page.evaluate(() => {
            window.updateRoomStatus({ roomId: 'room-123', users: [{ socketId: 'a' }, { socketId: 'b' }] });
        });
        const status = await page.$eval('#room-status', el => el.textContent);
        expect(status).toMatch(/Sala: 3 usuários/);
    });
}); 
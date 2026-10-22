const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createPhaseChallenge } = require('../lib/game-challenges');

const SECRET = 'isolated-tests-secret-without-network';
const USER_ID = '000000000000000000000001';

function setup({ progress = 1, databaseOffline = false, failSaveCreate = false, missingSave = false } = {}) {
    const routes = new Map();
    const globalMiddleware = [];
    let connections = 0;
    const users = new Map([[USER_ID, { _id: USER_ID, nickname: 'existing', password: bcrypt.hashSync('secret', 4), avatar: 'Personagem.png' }]]);
    const saves = new Map(missingSave ? [] : [[USER_ID, { _id: 'legacy-save-id', userId: USER_ID, saveProgress: progress, phase4Completed: false, bonusHighScore: 0 }]]);
    const saveUpdates = [];
    const app = { use: (...args) => globalMiddleware.push(args), listen() {} };
    for (const method of ['get', 'put', 'post']) {
        app[method] = (url, ...handlers) => routes.set(`${method} ${url}`, handlers);
    }
    class User {
        constructor(data) { Object.assign(this, data, { _id: '000000000000000000000002' }); }
        async save() { users.set(String(this._id), { ...this }); }
        static async findOne(query) { return [...users.values()].find(user => user.nickname === query.nickname) || null; }
        static async findById(id) { return users.get(String(id)) || null; }
        static async deleteOne(query) { users.delete(String(query._id)); }
    }
    User.collection = { createIndex: async () => 'registrationNickname_1' };
    const matches = (save, query) => {
        if (query._id && String(save._id) !== String(query._id)) return false;
        if (query.saveProgress && save.saveProgress < query.saveProgress.$gte) return false;
        if (query.$or && !query.$or.some(condition => condition.phase4Completed ? save.phase4Completed : save.saveProgress >= condition.saveProgress.$gte)) return false;
        return true;
    };
    const SaveData = {
        async findOne(query) { const save = saves.get(String(query.userId)); return save ? { ...save } : null; },
        async create(data) {
            if (failSaveCreate) throw new Error('Simulated partial registration failure');
            const save = { phase4Completed: false, bonusHighScore: 0, ...data };
            saves.set(String(data.userId), save);
            return { ...save };
        },
        async deleteOne(query) { saves.delete(String(query.userId)); },
        async findOneAndUpdate(query, update, options = {}) {
            saveUpdates.push({ query, update, options });
            let save = saves.get(String(query.userId));
            if (!save && options.upsert) {
                save = { _id: query._id, userId: query.userId, ...update.$setOnInsert };
                saves.set(String(query.userId), save);
            }
            if (!save || !matches(save, query)) return null;
            for (const [key, value] of Object.entries(update.$max || {})) save[key] = Math.max(save[key] || 0, value);
            Object.assign(save, update.$set || {});
            return { ...save };
        }
    };
    const mocks = {
        dotenv: { config() {} },
        express: Object.assign(() => app, { json: () => function jsonBody() {}, static: () => function staticFiles() {} }),
        mongoose: { connection: { readyState: databaseOffline ? 0 : 1 }, connect: async () => { connections++; throw new Error('Offline test database'); } },
        cors: () => function cors() {}, 'cookie-parser': () => function cookies() {},
        './Schema/Save': SaveData, './Schema/User': User
    };
    vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8'), {
        require: name => Object.hasOwn(mocks, name) ? mocks[name] : require(name.startsWith('.') ? path.resolve(__dirname, '..', name) : name),
        __dirname: path.resolve(__dirname, '..'), process: { env: { JWT_SECRET: SECRET } },
        console: { log() {}, error() {} }, Buffer
    });
    async function request(method, url, body = {}, token = jwt.sign({ purpose: 'session', userId: USER_ID }, SECRET)) {
        const req = { body, cookies: { token }, params: {} };
        const res = {
            code: 200,
            status(code) { this.code = code; return this; },
            json(data) { this.body = data; return this; },
            cookie() {}, clearCookie() { this.cleared = true; }, set() {},
            sendFile(file) { this.file = file; }, redirect(location) { this.redirected = location; }
        };
        const handlers = routes.get(`${method} ${url}`);
        assert.ok(handlers, `Missing test route ${method} ${url}`);
        async function dispatch(index) {
            if (index >= handlers.length) return;
            let continuation;
            await handlers[index](req, res, () => { continuation = dispatch(index + 1); });
            if (continuation) await continuation;
        }
        await dispatch(0);
        return res;
    }
    return { request, saves, users, saveUpdates, globalMiddleware, get connections() { return connections; } };
}

test('public pages and logout stay available when database is offline', async () => {
    const context = setup({ databaseOffline: true });
    for (const url of ['/', '/login', '/registrar', '/menu']) {
        const response = await context.request('get', url);
        assert.ok(response.file, url);
    }
    const logout = await context.request('post', '/logout');
    assert.equal(logout.code, 200);
    assert.equal(logout.cleared, true);
    assert.equal(context.connections, 0);
    // The global stack contains only parsers, CORS and static-file handlers.
    assert.equal(context.globalMiddleware.flat().some(handler => handler && handler.name === 'requireDatabase'), false);
    const protectedResponse = await context.request('get', '/api/save');
    assert.equal(protectedResponse.code, 503);
    assert.equal(context.connections, 1);
});

test('loading progress repairs a missing save and provides account identity and bonus record', async () => {
    const context = setup({ missingSave: true });
    const response = await context.request('get', '/api/save');
    assert.equal(response.code, 200);
    assert.equal(response.body.userId, USER_ID);
    assert.equal(response.body.saveProgress, 1);
    assert.equal(response.body.bonusHighScore, 0);
    assert.equal(context.saves.size, 1);
    assert.equal(context.saves.get(USER_ID)._id, USER_ID);
    await context.request('get', '/api/save');
    assert.equal(context.saves.size, 1);
});

test('concurrent save repair uses the existing unique _id index without migrating legacy saves', async () => {
    const context = setup({ missingSave: true });
    const results = await Promise.all([
        context.request('get', '/api/save'),
        context.request('get', '/api/save')
    ]);
    assert.ok(results.every(result => result.code === 200));
    assert.equal(context.saves.size, 1);
    assert.equal(context.saves.get(USER_ID)._id, USER_ID);
    assert.ok(context.saveUpdates.every(({ query, options }) => options.upsert && query._id === USER_ID && query.userId === USER_ID));
    const legacy = setup();
    await legacy.request('get', '/api/save');
    assert.equal(legacy.saves.get(USER_ID)._id, 'legacy-save-id');
    assert.equal(legacy.saveUpdates.length, 0);
});

test('registration rejects bcrypt truncation and cleans partial registration writes', async () => {
    const context = setup({ failSaveCreate: true });
    const nicknames = require('../JS/nicknames');
    const validNickname = nicknames.criarGerador(() => 0)();
    assert.equal(nicknames.valido(validNickname), true);
    const tooLong = await context.request('post', '/register', { nickname: validNickname, password: 'á'.repeat(37) });
    assert.equal(tooLong.code, 400);
    assert.equal(context.users.size, 1);
    const partial = await context.request('post', '/register', { nickname: validNickname, password: 'normal-password' });
    assert.equal(partial.code, 400);
    assert.equal(context.users.size, 1);
    assert.equal(context.saves.size, 1);
    const successful = setup();
    assert.equal((await successful.request('post', '/register', { nickname: validNickname, password: 'normal-password' })).code, 201);
    const newUserId = '000000000000000000000002';
    assert.equal(successful.saves.get(newUserId)._id, newUserId);
    assert.equal(successful.saves.get(newUserId).userId, newUserId);
});

test('successful login repairs legacy accounts without saves and validates input types', async () => {
    const context = setup({ missingSave: true });
    assert.equal((await context.request('post', '/login', { nickname: { $ne: null }, password: 'secret' })).code, 400);
    assert.equal((await context.request('post', '/login', { nickname: 'existing', password: 'secret' })).code, 200);
    assert.equal(context.saves.get(USER_ID).saveProgress, 1);
});

test('phase completion rejects bare phase numbers, cross-account challenges, expiry and wrong answers', async () => {
    const context = setup();
    assert.equal((await context.request('put', '/api/save/avancar', { faseCompletada: 1 })).code, 400);
    const challenge = (await context.request('post', '/api/game/start', { fase: 1 })).body;
    assert.equal(challenge.questions.length, 4);
    const answers = challenge.questions.map(question => question.correct);
    assert.equal((await context.request('put', '/api/save/avancar', { faseCompletada: 1, challengeToken: challenge.challengeToken, answers: [999, ...answers.slice(1)] })).code, 400);
    const other = createPhaseChallenge('another-account', 1, SECRET);
    assert.equal((await context.request('put', '/api/save/avancar', { faseCompletada: 1, challengeToken: other.challengeToken, answers: other.questions.map(question => question.correct) })).code, 400);
    const expired = jwt.sign({ purpose: 'phase', userId: USER_ID, phase: 1, answers }, SECRET, { expiresIn: -1 });
    assert.equal((await context.request('put', '/api/save/avancar', { faseCompletada: 1, challengeToken: expired, answers })).code, 400);
    assert.equal((await context.request('put', '/api/save/avancar', { faseCompletada: 1, challengeToken: challenge.challengeToken, answers })).body.saveProgress, 2);
});

test('game challenges cannot be used as session cookies and locked phases cannot start', async () => {
    const context = setup();
    assert.equal((await context.request('post', '/api/game/start', { fase: 3 })).code, 403);
    const challenge = createPhaseChallenge(USER_ID, 1, SECRET);
    assert.equal((await context.request('get', '/api/save', {}, challenge.challengeToken)).code, 401);
    const oldSession = jwt.sign({ userId: USER_ID }, SECRET);
    assert.equal((await context.request('get', '/api/save', {}, oldSession)).code, 200);
});

test('out-of-order completion is monotonic and phase 4 requires the bonus answer', async () => {
    const context = setup({ progress: 3 });
    const phase1 = createPhaseChallenge(USER_ID, 1, SECRET);
    const phase3 = createPhaseChallenge(USER_ID, 3, SECRET);
    const complete = challenge => context.request('put', '/api/save/avancar', {
        faseCompletada: jwt.decode(challenge.challengeToken).phase,
        challengeToken: challenge.challengeToken, answers: challenge.questions.map(question => question.correct)
    });
    await Promise.all([complete(phase3), complete(phase1)]);
    assert.equal(context.saves.get(USER_ID).saveProgress, 4);
    assert.ok(context.saveUpdates.every(({ query }) => query._id === 'legacy-save-id'));
    assert.equal((await context.request('post', '/api/game/bonus')).code, 403);
    const phase4 = createPhaseChallenge(USER_ID, 4, SECRET);
    await complete(phase4);
    assert.equal(context.saves.get(USER_ID).saveProgress, 4);
    assert.equal(context.saves.get(USER_ID).phase4Completed, true);
    const challenge = (await context.request('post', '/api/game/bonus')).body;
    assert.equal((await context.request('put', '/api/save/bonus-unlock', { challengeToken: challenge.challengeToken, answer: challenge.question.correct + 1 })).code, 400);
    assert.equal((await context.request('put', '/api/save/bonus-unlock', { challengeToken: challenge.challengeToken, answer: challenge.question.correct })).body.saveProgress, 5);
    await complete(phase4);
    assert.equal(context.saves.get(USER_ID).saveProgress, 5);
});

test('bonus record belongs to the account and never regresses', async () => {
    const context = setup({ progress: 5 });
    assert.equal((await context.request('put', '/api/save/bonus-record', { score: 37 })).body.bonusHighScore, 37);
    assert.equal((await context.request('put', '/api/save/bonus-record', { score: 9 })).body.bonusHighScore, 37);
    for (const score of [-1, 1.5, '37', 1000001]) {
        assert.equal((await context.request('put', '/api/save/bonus-record', { score })).code, 400);
    }
    assert.equal((await context.request('get', '/api/save')).body.bonusHighScore, 37);
    const secondUserId = '000000000000000000000003';
    context.users.set(secondUserId, { _id: secondUserId, avatar: 'personagem2.png' });
    context.saves.set(secondUserId, { _id: 'second-save-id', userId: secondUserId, saveProgress: 5, phase4Completed: true, bonusHighScore: 0 });
    const secondSession = jwt.sign({ purpose: 'session', userId: secondUserId }, SECRET);
    assert.equal((await context.request('get', '/api/save', {}, secondSession)).body.bonusHighScore, 0);
    assert.equal((await context.request('put', '/api/save/bonus-record', { score: 8 }, secondSession)).body.bonusHighScore, 8);
    assert.equal((await context.request('get', '/api/save')).body.bonusHighScore, 37);
    assert.equal((await setup({ progress: 4 }).request('put', '/api/save/bonus-record', { score: 1 })).code, 403);
});

test('save schema bounds progress and score without connecting to MongoDB', async () => {
    const Save = require('../Schema/Save');
    for (const invalid of [{ saveProgress: 6 }, { saveProgress: 0 }, { saveProgress: 1.5 }, { bonusHighScore: -1 }, { bonusHighScore: 0.5 }]) {
        await assert.rejects(new Save({ userId: USER_ID, ...invalid }).validate());
    }
    await new Save({ userId: USER_ID, saveProgress: 5, bonusHighScore: 100 }).validate();
});

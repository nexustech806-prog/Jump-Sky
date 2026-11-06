const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createPhaseChallenge } = require('../lib/game-challenges');
const { createBonusRun, verifyBonusRun, pickupLayout } = require('../lib/bonus-run');

const SECRET = 'isolated-tests-secret-without-network';
const USER_ID = '000000000000000000000001';

function setup({ progress = 1, databaseOffline = false, failSaveCreate = false, missingSave = false } = {}) {
    const routes = new Map();
    const globalMiddleware = [];
    let connections = 0;
    const users = new Map([[USER_ID, { _id: USER_ID, nickname: 'existing', password: bcrypt.hashSync('secret', 4), avatar: 'Personagem.png' }]]);
    const saves = new Map(missingSave ? [] : [[USER_ID, { _id: 'legacy-save-id', userId: USER_ID, saveProgress: progress, phase4Completed: false, bonusHighScore: 0 }]]);
    const saveUpdates = [];
    let beforeSaveUpdate;
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
        if (query.bonusScoreGeneration !== undefined) {
            const expected = query.bonusScoreGeneration;
            if (expected.$in ? !expected.$in.includes(save.bonusScoreGeneration ?? null) : expected !== save.bonusScoreGeneration) return false;
        }
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
        async updateMany(query, update) {
            for (const save of saves.values()) {
                if (String(save.userId) === String(query.userId)) {
                    Object.assign(save, update.$set);
                    for (const [key, value] of Object.entries(update.$inc || {})) save[key] = (save[key] || 0) + value;
                }
            }
        },
        async findOneAndUpdate(query, update, options = {}) {
            if (beforeSaveUpdate) beforeSaveUpdate();
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
    return { request, saves, users, saveUpdates, globalMiddleware, beforeSaveWrite(callback) { beforeSaveUpdate = callback; }, get connections() { return connections; } };
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
    assert.equal(response.body.bonusScoreGeneration, 0);
    assert.equal(context.saves.size, 1);
    assert.equal(context.saves.get(USER_ID)._id, USER_ID);
    await context.request('get', '/api/save');
    assert.equal(context.saves.size, 1);
    context.saves.get(USER_ID).bonusScoreGeneration = 7;
    assert.equal((await context.request('get', '/api/save')).body.bonusScoreGeneration, 7);
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
    async function proofFor(score, session) {
        let run = (await context.request('post', '/api/game/bonus-run', {}, session)).body;
        while (score > run.startScore + run.questions.length) {
            run = (await context.request('post', '/api/game/bonus-run', {
                challengeToken: run.challengeToken, answers: run.questions.map(question => question.correct)
            }, session)).body;
        }
        return { score, challengeToken: run.challengeToken, answers: run.questions.slice(0, score - run.startScore).map(question => question.correct) };
    }
    assert.equal((await context.request('put', '/api/save/bonus-record', await proofFor(37))).body.bonusHighScore, 37);
    assert.equal((await context.request('put', '/api/save/bonus-record', await proofFor(9))).body.bonusHighScore, 37);
    for (const score of [-1, 1.5, '37', 1000001]) {
        assert.equal((await context.request('put', '/api/save/bonus-record', { score })).code, 400);
    }
    assert.equal((await context.request('get', '/api/save')).body.bonusHighScore, 37);
    const secondUserId = '000000000000000000000003';
    context.users.set(secondUserId, { _id: secondUserId, avatar: 'personagem2.png' });
    context.saves.set(secondUserId, { _id: 'second-save-id', userId: secondUserId, saveProgress: 5, phase4Completed: true, bonusHighScore: 0 });
    const secondSession = jwt.sign({ purpose: 'session', userId: secondUserId }, SECRET);
    assert.equal((await context.request('get', '/api/save', {}, secondSession)).body.bonusHighScore, 0);
    assert.equal((await context.request('put', '/api/save/bonus-record', await proofFor(8, secondSession), secondSession)).body.bonusHighScore, 8);
    assert.equal((await context.request('get', '/api/save')).body.bonusHighScore, 37);
    const lockedRun = createBonusRun(USER_ID, 0, SECRET);
    assert.equal((await setup({ progress: 4 }).request('put', '/api/save/bonus-record', {
        score: 1, challengeToken: lockedRun.challengeToken, answers: [lockedRun.questions[0].correct]
    })).code, 403);
});

test('bonus score proofs reject fabricated scores, other accounts, finished games and stale reset generations', async () => {
    const context = setup({ progress: 5 });
    const run = (await context.request('post', '/api/game/bonus-run', {})).body;
    const answers = [run.questions[0].correct];
    const expired = jwt.sign({ ...jwt.decode(run.challengeToken), exp: Math.floor(Date.now() / 1000) - 1 }, SECRET);
    for (const payload of [
        { score: 999999 },
        { score: 999999, challengeToken: run.challengeToken, answers },
        { score: 1, challengeToken: run.challengeToken + 'tampered', answers },
        { score: 1, challengeToken: expired, answers },
        { score: 1, challengeToken: createBonusRun('another-account', 0, SECRET).challengeToken, answers },
        { score: 1, challengeToken: run.challengeToken, answers: ['not-an-answer'] }
    ]) {
        assert.equal((await context.request('put', '/api/save/bonus-record', payload)).code, 400);
    }
    const proof = { score: 1, challengeToken: run.challengeToken, answers };
    assert.equal((await context.request('get', '/api/save', {}, run.challengeToken)).code, 401);
    assert.equal((await context.request('put', '/api/save/bonus-record', proof)).body.bonusHighScore, 1);
    assert.equal((await context.request('put', '/api/save/bonus-record', proof)).body.bonusHighScore, 1);
    assert.equal((await context.request('post', '/api/game/bonus-run', { challengeToken: run.challengeToken, answers })).code, 400);
    assert.equal((await context.request('post', '/api/game/reset', { confirm: true })).code, 200);
    context.saves.get(USER_ID).saveProgress = 5;
    assert.equal((await context.request('put', '/api/save/bonus-record', proof)).code, 400);
    assert.equal(context.saves.get(USER_ID).bonusHighScore, 0);
});

test('a reset racing a verified record write cannot restore the previous game score', async () => {
    const context = setup({ progress: 5 });
    const run = (await context.request('post', '/api/game/bonus-run', {})).body;
    context.beforeSaveWrite(() => {
        // A reset and later phase unlock completed after proof validation but
        // before the atomic record update reached the database.
        const save = context.saves.get(USER_ID);
        save.bonusScoreGeneration = 1;
        save.bonusHighScore = 0;
        save.saveProgress = 5;
    });
    const response = await context.request('put', '/api/save/bonus-record', {
        score: 1, challengeToken: run.challengeToken, answers: [run.questions[0].correct]
    });
    assert.equal(response.code, 403);
    assert.equal(context.saves.get(USER_ID).bonusHighScore, 0);
});

test('bonus timeout skips cost a life and continuation preserves verified progress and signed pickups', async () => {
    const context = setup({ progress: 5 });
    const run = (await context.request('post', '/api/game/bonus-run', {})).body;
    const answers = run.questions.map(question => question.correct);
    answers[0] = { answer: null, timeouts: 1 };
    answers[1] = run.questions[1].answers.find(answer => answer !== run.questions[1].correct);
    const response = await context.request('put', '/api/save/bonus-record', { score: 18, challengeToken: run.challengeToken, answers });
    assert.equal(response.body.score, 18);
    assert.ok(response.body.lives >= 2 && response.body.lives <= 3);
    assert.equal(response.body.skips, 1);
    const next = await context.request('post', '/api/game/bonus-run', { challengeToken: run.challengeToken, answers });
    assert.equal(next.body.startScore, 18);
    assert.equal(next.body.startLives, response.body.lives);
    assert.equal(next.body.startSkips, response.body.skips);
    const cycle = Math.floor(next.body.startScore / 10);
    assert.deepEqual(next.body.pickupLayouts[cycle], run.pickupLayouts[cycle]);
    const exhausted = run.questions.slice(0, 4).map(question => question.answers.find(answer => answer !== question.correct));
    assert.equal((await context.request('put', '/api/save/bonus-record', { score: 0, challengeToken: run.challengeToken, answers: exhausted })).code, 400);
    assert.equal((await context.request('put', '/api/save/bonus-record', { score: 0, challengeToken: run.challengeToken, answers: exhausted.slice(0, 3) })).body.lives, 0);
});

test('bonus pickups are signed and deterministic, heal at most three lives, and provide at most one inventory skip', () => {
    const seed = '0'.repeat(64);
    const layout = pickupLayout(seed, 0);
    assert.equal(Object.keys(layout).length, 2);
    assert.deepEqual(Object.values(layout).sort(), ['heal', 'skip']);
    const platforms = Object.keys(layout).map(Number).sort((a, b) => a - b);
    assert.ok(platforms[0] >= 2 && platforms[0] <= 4);
    assert.ok(platforms[1] >= 6 && platforms[1] <= 9);
    const healPlatform = Number(Object.keys(layout).find(platform => layout[platform] === 'heal'));
    const skipPlatform = Number(Object.keys(layout).find(platform => layout[platform] === 'skip'));
    const run = createBonusRun(USER_ID, 0, SECRET, 0, 2, 0, seed);
    const correct = run.questions.map(question => question.correct);
    const healed = verifyBonusRun(run.challengeToken, USER_ID, 0, correct.slice(0, healPlatform), SECRET);
    assert.equal(healed.lives, 3);
    const fullLives = createBonusRun(USER_ID, 0, SECRET, 0, 3, 1, seed);
    const full = verifyBonusRun(fullLives.challengeToken, USER_ID, 0, fullLives.questions.slice(0, 10).map(question => question.correct), SECRET);
    assert.equal(full.lives, 3);
    assert.equal(full.skips, 1);
    const answers = correct.slice(0, skipPlatform);
    const acquired = verifyBonusRun(run.challengeToken, USER_ID, 0, answers, SECRET);
    assert.equal(acquired.skips, 1);
    answers.push({ answer: null, timeouts: 0, skip: true });
    const skipped = verifyBonusRun(run.challengeToken, USER_ID, 0, answers, SECRET);
    assert.equal(skipped.skips, 0);
    assert.equal(skipped.score, acquired.score);
    assert.equal(skipped.lives, acquired.lives);
    assert.throws(() => verifyBonusRun(run.challengeToken, USER_ID, 0, [...answers, { answer: null, skip: true }], SECRET), /pulo/);
    assert.throws(() => verifyBonusRun(run.challengeToken, USER_ID, 0, [null], SECRET), /Pulo/);
    assert.throws(() => verifyBonusRun(run.challengeToken, USER_ID, 0, [{ answer: null, skip: true }], SECRET), /pulo/);
});

test('bonus timeout retries lose one life each without consuming the signed question or allowing answers after death', () => {
    const run = createBonusRun(USER_ID, 0, SECRET);
    const answer = run.questions[0].correct;
    const once = verifyBonusRun(run.challengeToken, USER_ID, 0, [{ answer, timeouts: 1 }], SECRET);
    assert.equal(once.score, 1);
    assert.equal(once.lives, 2);
    const twice = verifyBonusRun(run.challengeToken, USER_ID, 0, [{ answer, timeouts: 2 }], SECRET);
    assert.equal(twice.score, 1);
    assert.equal(twice.lives, 1);
    assert.throws(() => verifyBonusRun(run.challengeToken, USER_ID, 0, [{ answer, timeouts: 3 }], SECRET), /inválida/);
    const skipped = verifyBonusRun(run.challengeToken, USER_ID, 0, [{ answer: null, timeouts: 1 }], SECRET);
    assert.equal(skipped.score, 0);
    assert.equal(skipped.lives, 2);
});

test('save schema bounds progress and score without connecting to MongoDB', async () => {
    const Save = require('../Schema/Save');
    for (const invalid of [{ saveProgress: 6 }, { saveProgress: 0 }, { saveProgress: 1.5 }, { bonusHighScore: -1 }, { bonusHighScore: 0.5 }]) {
        await assert.rejects(new Save({ userId: USER_ID, ...invalid }).validate());
    }
    await new Save({ userId: USER_ID, saveProgress: 5, bonusHighScore: 100 }).validate();
});

test('new game requires confirmation and resets only the authenticated account progress', async () => {
    const context = setup({ progress: 5 });
    const other = '000000000000000000000002';
    context.saves.set(other, { _id: other, userId: other, saveProgress: 4, bonusHighScore: 25 });
    context.saves.get(USER_ID).phase4Completed = true;
    context.saves.get(USER_ID).bonusHighScore = 100;
    context.saves.set('duplicate-legacy-save', {
        _id: 'duplicate-legacy-save', userId: USER_ID,
        saveProgress: 5, phase4Completed: true, bonusHighScore: 150
    });
    for (const body of [{}, { confirm: 'true' }]) {
        assert.equal((await context.request('post', '/api/game/reset', body)).code, 400);
        assert.equal(context.saves.get(USER_ID).saveProgress, 5);
    }
    assert.equal((await context.request('post', '/api/game/reset', { confirm: true }, 'invalid')).code, 401);
    const response = await context.request('post', '/api/game/reset', { confirm: true, userId: other });
    assert.equal(response.code, 200);
    assert.equal(response.body.userId, USER_ID);
    assert.equal(context.saves.get(USER_ID).saveProgress, 1);
    assert.equal(context.saves.get(USER_ID).bonusHighScore, 0);
    assert.equal(context.saves.get(USER_ID).phase4Completed, false);
    assert.equal(context.saves.get('duplicate-legacy-save').bonusHighScore, 0);
    assert.equal(context.saves.get('duplicate-legacy-save').saveProgress, 1);
    assert.equal(context.saves.get('duplicate-legacy-save').bonusScoreGeneration, 1);
    assert.equal(context.users.get(USER_ID).nickname, 'existing');
    assert.equal(context.users.get(USER_ID).avatar, 'Personagem.png');
    assert.equal(context.saves.get(other).saveProgress, 4);
    assert.equal(context.saves.get(other).bonusHighScore, 25);
});

test('new game handles database failure and repairs missing saves', async () => {
    const offline = setup({ databaseOffline: true });
    assert.equal((await offline.request('post', '/api/game/reset', { confirm: true })).code, 503);
    const missing = setup({ missingSave: true });
    assert.equal((await missing.request('post', '/api/game/reset', { confirm: true })).code, 200);
    assert.equal(missing.saves.get(USER_ID).saveProgress, 1);
});

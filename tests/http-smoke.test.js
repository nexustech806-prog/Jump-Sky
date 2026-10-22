const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const express = require('express');
const jwt = require('jsonwebtoken');
const { once } = require('node:events');

// Exercise real Express routing and cookies against an isolated in-memory database.
async function server(t, offline = false) {
    const app = express();
    const realListen = app.listen.bind(app);
    app.listen = () => {};
    const userId = '000000000000000000000001';
    const secret = 'local-http-regression-test-secret';
    let save = { _id: userId, userId, saveProgress: 1, phase4Completed: false, bonusHighScore: 0 };
    const SaveData = {
        findOne: async () => ({ ...save }),
        findOneAndUpdate: async (query, update) => {
            if (query.saveProgress && save.saveProgress < query.saveProgress.$gte) return null;
            if (query.$or && !save.phase4Completed && save.saveProgress < 5) return null;
            for (const [key, value] of Object.entries(update.$max || {})) save[key] = Math.max(save[key] || 0, value);
            Object.assign(save, update.$set);
            return { ...save };
        }
    };
    const mocks = {
        dotenv: { config() {} },
        express: Object.assign(() => app, { json: express.json, static: express.static }),
        mongoose: { connection: { readyState: offline ? 0 : 1 }, connect: async () => { throw new Error('Isolated offline database'); } },
        './Schema/Save': SaveData,
        './Schema/User': { findById: async () => ({ _id: userId, avatar: 'Personagem.png' }) }
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8'), {
        require: name => Object.hasOwn(mocks, name) ? mocks[name] : require(name.startsWith('.') ? path.resolve(__dirname, '..', name) : name),
        __dirname: path.resolve(__dirname, '..'), process: { env: { JWT_SECRET: secret } }, console, Buffer
    });
    const listener = realListen(0, '127.0.0.1');
    t.after(() => new Promise(resolve => { listener.close(resolve); listener.closeAllConnections(); }));
    await once(listener, 'listening');
    const origin = `http://127.0.0.1:${listener.address().port}`;
    const session = jwt.sign({ userId, purpose: 'session' }, secret);
    const request = (url, method = 'GET', body, token = session) => fetch(origin + url, {
        method, redirect: 'manual',
        headers: { 'Content-Type': 'application/json', Cookie: `token=${token}` },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    return { request };
}

test('HTTP public pages, assets and logout work offline; protected routes still enforce sessions', async t => {
    const { request } = await server(t, true);
    assert.equal((await request('/')).status, 200);
    assert.equal((await request('/menu')).status, 200);
    assert.equal((await request('/JS/game-session.js')).status, 200);
    assert.equal((await request('/favicon.ico')).status, 404);
    const logout = await request('/logout', 'POST');
    assert.equal(logout.status, 200);
    assert.match(logout.headers.get('set-cookie'), /token=;/);
    assert.equal((await request('/api/save')).status, 503);
    assert.equal((await request('/api/save', 'GET', undefined, 'invalid')).status, 401);
    const phase = await request('/somando-nas-nuvens', 'GET', undefined, 'invalid');
    assert.equal(phase.status, 302);
    assert.equal(phase.headers.get('location'), '/login');
});

test('HTTP phase progression requires answers and bonus unlock, then persists the account record', async t => {
    const { request } = await server(t);
    assert.equal((await request('/api/save/avancar', 'PUT', { faseCompletada: 1 })).status, 400);
    for (let phase = 1; phase <= 4; phase++) {
        const start = await request('/api/game/start', 'POST', { fase: phase });
        assert.equal(start.status, 200);
        const challenge = await start.json();
        const completed = await request('/api/save/avancar', 'PUT', {
            faseCompletada: phase, challengeToken: challenge.challengeToken,
            answers: challenge.questions.map(question => question.correct)
        });
        assert.equal(completed.status, 200);
        assert.equal((await completed.json()).saveProgress, Math.min(4, phase + 1));
    }
    const locked = await request('/pulando-no-espaco');
    assert.equal(locked.headers.get('location'), '/dividindo-no-vulcao');
    const bonus = await (await request('/api/game/bonus', 'POST', {})).json();
    const unlocked = await request('/api/save/bonus-unlock', 'PUT', { challengeToken: bonus.challengeToken, answer: bonus.question.correct });
    assert.equal((await unlocked.json()).saveProgress, 5);
    assert.equal((await request('/pulando-no-espaco')).status, 200);
    await request('/api/save/bonus-record', 'PUT', { score: 17 });
    await request('/api/save/bonus-record', 'PUT', { score: 3 });
    assert.equal((await (await request('/api/save')).json()).bonusHighScore, 17);
});

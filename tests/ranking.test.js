const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { once } = require('node:events');
const express = require('express');
const jwt = require('jsonwebtoken');
const { publicPlayers, personalRanking } = require('../lib/leaderboard');

test('leaderboard shares competition positions on ties and only publishes safe fields', () => {
    const result = publicPlayers([
        { score: 80, nickname: 'PandaPipoca07', avatar: 'personagem3.png', userId: 'private-id', password: 'private-password' },
        { score: 80, nickname: 'CoalaConfete08', avatar: 'personagem2.png' },
        { score: 40, nickname: 'Maria Silva', avatar: '../private-image' },
        { score: 20, nickname: '<script>alert(1)</script>', avatar: 'PERSONAGEM.PNG' }
    ]);
    assert.deepEqual(result.map(player => player.position), [1, 1, 3, 4]);
    assert.deepEqual(result.map(player => player.nickname), ['PandaPipoca07', 'CoalaConfete08', 'Aventureiro das nuvens', 'Aventureiro das nuvens']);
    assert.deepEqual(Object.keys(result[0]).sort(), ['avatar', 'nickname', 'position', 'score']);
    assert.equal(result[2].avatar, 'Personagem.png');
    assert.equal(result[3].avatar, 'Personagem.png');
    assert.doesNotMatch(JSON.stringify(result), /Maria|script|private|password|userId/);
});

test('personal position includes every tied account ahead and stays empty without a record', () => {
    const scores = [{ _id: 80, count: 2 }, { _id: 40, count: 3 }, { _id: 10, count: 1 }];
    assert.deepEqual(personalRanking({ personal: [{ score: 80 }], scores }), { position: 1, score: 80, totalPlayers: 6 });
    assert.deepEqual(personalRanking({ personal: [{ score: 40 }], scores }), { position: 3, score: 40, totalPlayers: 6 });
    assert.deepEqual(personalRanking({ personal: [{ score: 10 }], scores }), { position: 6, score: 10, totalPlayers: 6 });
    assert.deepEqual(personalRanking({ personal: [], scores }), { position: null, score: 0, totalPlayers: 6 });
    assert.deepEqual(personalRanking(), { position: null, score: 0, totalPlayers: 0 });
});

// Real Express routing with a controlled aggregate response. These tests never
// load .env, open a database connection, or alter a real player's records.
async function server(t, offline = false) {
    const app = express();
    const realListen = app.listen.bind(app);
    app.listen = () => {};
    const userId = '000000000000000000000001';
    const secret = 'ranking-isolated-http-secret';
    let failure = false, missingAccount = false, empty = false;
    const queries = [];
    const SaveData = {
        async aggregate(pipeline) {
            queries.push(pipeline);
            if (failure) throw new Error('Private database error');
            const facet = pipeline.at(-1).$facet;
            if (facet.players) return [{
                players: empty ? [] : [
                    { nickname: 'PandaPipoca07', avatar: 'Personagem.png', score: 75, _id: 'private' },
                    { nickname: 'Real Name', avatar: 'personagem2.png', score: 75 }
                ],
                totals: empty ? [] : [{ count: 12 }]
            }];
            assert.equal(facet.personal[0].$match._id, userId);
            return [{ personal: empty ? [] : [{ score: 20 }], scores: empty ? [] : [{ _id: 75, count: 2 }, { _id: 20, count: 10 }] }];
        }
    };
    const mocks = {
        dotenv: { config() {} },
        express: Object.assign(() => app, { json: express.json, static: express.static }),
        mongoose: { connection: { readyState: offline ? 0 : 1 }, connect: async () => { throw new Error('Offline test database'); } },
        './Schema/Save': SaveData,
        './Schema/User': { collection: { name: 'users' }, findById: async id => !missingAccount && id === userId ? { _id: userId, password: 'private' } : null }
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8'), {
        require: name => Object.hasOwn(mocks, name) ? mocks[name] : require(name.startsWith('.') ? path.resolve(__dirname, '..', name) : name),
        __dirname: path.resolve(__dirname, '..'), process: { env: { JWT_SECRET: secret } }, console, Buffer
    });
    const listener = realListen(0, '127.0.0.1');
    t.after(() => new Promise(resolve => { listener.close(resolve); listener.closeAllConnections(); }));
    await once(listener, 'listening');
    const origin = `http://127.0.0.1:${listener.address().port}`;
    const token = jwt.sign({ userId, purpose: 'session' }, secret);
    const request = (url, session = token) => fetch(origin + url, { headers: session ? { Cookie: `token=${session}` } : {} });
    return {
        request, queries, challengeToken: jwt.sign({ userId, purpose: 'phase' }, secret),
        setFailure(value) { failure = value; }, setMissing(value) { missingAccount = value; }, setEmpty(value) { empty = value; }
    };
}

test('HTTP ranking is public, strips private fields, and personal ranking uses only the session account', async t => {
    const context = await server(t);
    const response = await context.request('/api/ranking', null);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const ranking = await response.json();
    assert.equal(ranking.totalPlayers, 12);
    assert.deepEqual(ranking.players.map(player => player.position), [1, 1]);
    assert.doesNotMatch(JSON.stringify(ranking), /Real Name|private|password|userId|_id/);
    const personal = await context.request('/api/ranking/me?userId=another-account');
    assert.equal(personal.status, 200);
    assert.deepEqual(await personal.json(), { position: 3, score: 20, totalPlayers: 12 });
    assert.equal(personal.headers.get('cache-control'), 'no-store');
    // The database limits the public result, without transferring full accounts.
    const publicFacet = context.queries[0].at(-1).$facet;
    assert.equal(publicFacet.players.find(stage => stage.$limit).$limit, 10);
    const lookup = context.queries[0].find(stage => stage.$lookup).$lookup;
    assert.deepEqual(lookup.pipeline.at(-1).$project, { nickname: 1, avatar: 1 });
});

test('HTTP personal ranking rejects absent, invalid and game-challenge sessions before querying data', async t => {
    const context = await server(t);
    for (const token of [null, 'invalid', context.challengeToken]) {
        const response = await context.request('/api/ranking/me', token);
        assert.equal(response.status, 401);
        assert.equal(response.headers.get('cache-control'), 'no-store');
    }
    assert.equal(context.queries.length, 0);
    context.setMissing(true);
    assert.equal((await context.request('/api/ranking/me')).status, 404);
    assert.equal(context.queries.length, 0);
});

test('HTTP rankings represent empty data honestly and database failures are retryable without caching errors', async t => {
    const context = await server(t);
    context.setEmpty(true);
    assert.deepEqual(await (await context.request('/api/ranking')).json(), { players: [], totalPlayers: 0 });
    assert.deepEqual(await (await context.request('/api/ranking/me')).json(), { position: null, score: 0, totalPlayers: 0 });
    context.setFailure(true);
    for (const route of ['/api/ranking', '/api/ranking/me']) {
        const response = await context.request(route);
        assert.equal(response.status, 503);
        assert.equal(response.headers.get('cache-control'), 'no-store');
        const message = (await response.json()).mensagem;
        assert.match(message, /Tente novamente/);
        assert.doesNotMatch(message, /Private database error/);
    }
    context.setFailure(false);
    assert.equal((await context.request('/api/ranking')).status, 200);
    const offline = await server(t, true);
    for (const route of ['/api/ranking', '/api/ranking/me']) {
        const response = await offline.request(route);
        assert.equal(response.status, 503);
        assert.equal(response.headers.get('cache-control'), 'no-store');
    }
    assert.equal(offline.queries.length, 0);
});

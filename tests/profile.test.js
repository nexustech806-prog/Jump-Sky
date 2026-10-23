const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function setup() {
    const routes = new Map();
    const account = { nickname: 'PandaPipoca07', avatar: 'Personagem.png', password: 'secret' };
    let conflict = false, duplicate = false;
    const writes = [];
    let save = { bonusHighScore: 1250 };
    const app = { use() {}, listen() {} };
    for (const method of ['get', 'post', 'put']) app[method] = (url, ...handlers) => routes.set(`${method} ${url}`, handlers);
    const User = {
        findById: async () => ({ ...account }),
        findOne: async () => conflict ? { nickname: 'CoalaConfete08' } : null,
        collection: { createIndex: async () => {} },
        findByIdAndUpdate: async (id, update) => {
            assert.equal(id, 'session-user');
            if (duplicate) throw Object.assign(new Error(), { code: 11000 });
            writes.push(update);
            Object.assign(account, update.$set);
            return { ...account };
        }
    };
    const mocks = {
        express: Object.assign(() => app, { json() {}, static() {} }),
        './Schema/User': User, './Schema/Save': { findOne: async query => {
            assert.equal(query.userId, 'session-user');
            return save;
        } }, mongoose: {}, cors: () => {},
        'cookie-parser': () => {}, dotenv: { config() {} }, bcryptjs: {}, jsonwebtoken: {}
    };
    vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8'), {
        require: name => Object.hasOwn(mocks, name) ? mocks[name] : require(name.startsWith('.') ? path.resolve(__dirname, '..', name) : name),
        __dirname: path.resolve(__dirname, '..'), process: { env: {} }, console
    });
    async function request(method, body) {
        const res = { code: 200, set() {}, status(code) { this.code = code; return this; }, json(data) { this.body = data; return this; } };
        await routes.get(`${method} /api/profile`).at(-1)({ userId: 'session-user', body }, res);
        return res;
    }
    return { routes, request, account, writes, setSave(value) { save = value; }, conflict() { conflict = true; }, duplicate() { duplicate = true; } };
}

test('profile reads public profile fields and persists customization for the authenticated account', async () => {
    const app = setup();
    assert.deepEqual(Object.keys((await app.request('get')).body).sort(), ['avatar', 'bonusHighScore', 'nickname']);
    const saved = await app.request('put', { nickname: 'CoalaConfete08', avatar: 'personagem3.png', userId: 'another-user', password: 'changed' });
    assert.equal(saved.code, 200);
    const read = await app.request('get');
    assert.equal(read.body.nickname, 'CoalaConfete08');
    assert.equal(read.body.avatar, 'personagem3.png');
    assert.equal(app.account.registrationNickname, 'CoalaConfete08');
    assert.equal(app.account.password, 'secret');
});

test('profile shows the account bonus record and defaults to zero for new or legacy saves', async () => {
    const app = setup();
    assert.equal((await app.request('get')).body.bonusHighScore, 1250);
    for (const save of [null, {}, { bonusHighScore: 0 }]) {
        app.setSave(save);
        assert.equal((await app.request('get')).body.bonusHighScore, 0);
    }
});

test('profile rejects arbitrary names and avatars without partial saves', async () => {
    const app = setup();
    for (const body of [null, {}, { nickname: 'Maria', avatar: 'personagem2.png' }, { nickname: 'CoalaConfete08', avatar: '../file' }]) {
        assert.equal((await app.request('put', body)).code, 400);
    }
    assert.equal(app.writes.length, 0);
});

test('profile conflicts, including concurrent nickname claims, leave both fields unchanged', async () => {
    for (const kind of ['conflict', 'duplicate']) {
        const app = setup();
        app[kind]();
        assert.equal((await app.request('put', { nickname: 'CoalaConfete08', avatar: 'personagem2.png' })).code, 409);
        assert.equal(app.account.avatar, 'Personagem.png');
        assert.equal(app.account.nickname, 'PandaPipoca07');
    }
});

test('legacy accounts can keep their nickname and change avatar', async () => {
    const app = setup();
    app.account.nickname = 'LegacyNickname';
    assert.equal((await app.request('put', { nickname: 'LegacyNickname', avatar: 'personagem4.png' })).code, 200);
    assert.equal(app.account.avatar, 'personagem4.png');
});

test('profile page and API reject unauthenticated access', () => {
    const { routes } = setup();
    let destination;
    routes.get('get /perfil')[0]({ cookies: {} }, { redirect(value) { destination = value; } });
    assert.equal(destination, '/login');
    for (const method of ['get', 'put']) {
        const res = { status(code) { this.code = code; return this; }, json() {} };
        routes.get(`${method} /api/profile`)[0]({ cookies: {} }, res);
        assert.equal(res.code, 401);
    }
});

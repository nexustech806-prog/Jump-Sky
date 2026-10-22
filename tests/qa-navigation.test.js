const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function routesWith(progress) {
    const routes = new Map();
    const app = { use() {}, listen() {} };
    for (const method of ['get', 'put', 'post']) app[method] = (route, ...handlers) => {
        const key = `${method} ${route}`;
        assert.equal(routes.has(key), false, `Duplicate route: ${key}`);
        routes.set(key, handlers.at(-1));
    };
    const mocks = {
        dotenv: { config() {} },
        express: Object.assign(() => app, { json() {}, static() {} }),
        mongoose: {}, cors: () => {}, 'cookie-parser': () => {}, jsonwebtoken: {}, bcryptjs: {},
        './Schema/Save': { findOne: async () => progress === null ? null : { saveProgress: progress } },
        './Schema/User': { findByIdAndUpdate: async (id, update) => ({ avatar: update.$set.avatar }) }
    };
    vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8'), {
        require: name => Object.hasOwn(mocks, name) ? mocks[name] : require(name.startsWith('.') ? path.resolve(__dirname, '..', name) : name),
        __dirname: path.resolve(__dirname, '..'), process: { env: {} }, console
    });
    return routes;
}

test('Jogar resumes saved phases and handles new and completed games', async () => {
    for (const [progress, expected] of [[null, 'somando-nas-nuvens'], [2, 'subtraindo-no-subsolo'], [3, 'multiplicando-no-oceano'], [4, 'dividindo-no-vulcao'], [5, 'pulando-no-espaco'], [6, 'pulando-no-espaco']]) {
        let target;
        await routesWith(progress).get('get /jogar')({ userId: 'user' }, { redirect: value => { target = value; } });
        assert.equal(target, `/${expected}`);
    }
});

test('all four selectable avatars can be saved through the single avatar route', async () => {
    const handler = routesWith(1).get('put /api/avatar');
    for (const avatar of ['Personagem.png', 'personagem2.png', 'personagem3.png', 'personagem4.png']) {
        const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
        await handler({ userId: 'user', body: { avatar } }, res);
        assert.equal(res.code, 200);
        assert.equal(res.body.avatar, avatar);
    }
});

test('logout waits for the server and keeps failures retryable', async () => {
    for (const ok of [true, false]) {
        let listener, destination, resolve;
        const status = {};
        const button = { addEventListener: (_, fn) => { listener = fn; } };
        const context = vm.createContext({
            document: { getElementById: id => id === 'sairBtn' ? button : id === 'contaStatus' ? status : null, querySelectorAll: () => [], querySelector: () => null },
            API_URL: '', AbortController, setTimeout, clearTimeout,
            fetch: url => url === '/logout' ? new Promise(done => { resolve = data => done({ ...data, json: async () => ({}) }); }) : Promise.resolve({ ok: false, json: async () => ({}) }),
            window: { location: { assign: value => { destination = value; } } }, console
        });
        vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../JS/request.js'), 'utf8'), context);
        vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../JS/menu.js'), 'utf8'), context);
        const pending = listener({ currentTarget: button });
        assert.equal(button.disabled, true);
        assert.equal(destination, undefined);
        resolve({ ok });
        await pending;
        if (ok) assert.equal(destination, '/login');
        else { assert.equal(destination, undefined); assert.equal(button.disabled, false); assert.match(status.textContent, /Tente novamente/); }
    }
});


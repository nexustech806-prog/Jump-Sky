const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const nomes = require('../JS/nicknames');

test('all combinations are distinct, readable, and accepted by the generator', () => {
  const next = nomes.criarGerador();
  const seen = new Set();
  for (let i = 0; i < nomes.total; i++) {
    const name = next();
    assert.ok(nomes.valido(name));
    assert.match(name, /^[A-Za-z]+\d{2}$/);
    assert.ok(name.length <= 32);
    assert.ok(!seen.has(name), name);
    seen.add(name);
  }
  assert.equal(next(), null);
  assert.equal(seen.size, 201600);
});

test('shuffle terminates without repetitions even with a constant random source', () => {
  const next = nomes.criarGerador(() => 0);
  const seen = new Set(Array.from({ length: 1000 }, next));
  assert.equal(seen.size, 1000);
});

test('rejects old English nicknames and arbitrary input', () => {
  for (const value of [null, {}, '', 'ShadowWolf123', 'PandaPipoca', 'PandaPipoca100', 'PandaPipoca0x', 'PandaPipoca00\n']) {
    assert.equal(nomes.valido(value), false);
  }
  assert.equal(nomes.valido('PandaPipoca07'), true);
});

function serverWith(User) {
  const routes = new Map();
  const app = { use() {}, get() {}, post(route, handler) { routes.set(route, handler); }, put() {}, listen() {} };
  const express = Object.assign(() => app, { json() {}, static() {} });
  const mocks = {
    express, './Schema/User': User, './Schema/Save': { create: async () => {} },
    mongoose: {}, cors: () => {}, 'cookie-parser': () => {},
    dotenv: { config() {} }, bcryptjs: { hash: async () => 'hash' },
    jsonwebtoken: { sign: () => 'token' }
  };
  const localRequire = name => Object.hasOwn(mocks, name) ? mocks[name]
    : name.startsWith('.') ? require(path.resolve(__dirname, '..', name)) : require(name);
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8'), {
    require: localRequire, __dirname: path.resolve(__dirname, '..'), process: { env: {} }, console
  });
  return routes;
}

function response() {
  return { code: 200, status(code) { this.code = code; return this; },
    set() {}, cookie() {}, json(body) { this.body = body; return this; } };
}

test('availability excludes registered names, deduplicates, and bounds requests', async () => {
  const routes = serverWith({ find: () => ({ select: () => ({ lean: async () => [{ nickname: 'PandaPipoca07' }] }) }) });
  const handler = routes.get('/api/nicknames/available');
  const res = response();
  await handler({ body: { candidates: ['PandaPipoca07', 'CoalaConfete08', 'CoalaConfete08'] } }, res);
  assert.equal(JSON.stringify(res.body.available), JSON.stringify(['CoalaConfete08']));
  for (const candidates of [[], ['ShadowWolf123'], Array(13).fill('PandaPipoca07')]) {
    const invalid = response();
    await handler({ body: { candidates } }, invalid);
    assert.equal(invalid.code, 400);
  }
});

test('availability failures are retryable and never report names as available', async () => {
  const routes = serverWith({ find() { throw new Error('database unavailable'); } });
  const res = response();
  await routes.get('/api/nicknames/available')({ body: { candidates: ['PandaPipoca07'] } }, res);
  assert.equal(res.code, 503);
  assert.equal(res.body.available, undefined);
});

test('simultaneous registrations share index creation and reject the losing insert without Model.init', async () => {
  let saved = false;
  let indexChecks = 0;
  class User {
    constructor(data) { Object.assign(this, data); this._id = 'user-id'; }
    static async findOne() { return null; }
    static collection = { createIndex: async (key, options) => {
      assert.equal(key.registrationNickname, 1);
      assert.equal(options.unique, true);
      assert.equal(options.sparse, true);
      indexChecks++;
    } };
    static init() { throw new Error('Model.init must not block registration'); }
    async save() {
      assert.equal(this.registrationNickname, this.nickname);
      if (saved) throw Object.assign(new Error('duplicate'), { code: 11000 });
      saved = true;
    }
  }
  const routes = serverWith(User);
  const req = { body: { nickname: 'PandaPipoca07', password: 'test-password' } };
  const first = response(), second = response();
  await Promise.all([routes.get('/register')(req, first), routes.get('/register')(req, second)]);
  assert.equal(first.code, 201);
  assert.equal(second.code, 409);
  assert.equal(indexChecks, 1);
});

test('index creation failures respond with 503 and can be retried', async () => {
  let attempts = 0;
  class User {
    constructor(data) { Object.assign(this, data); }
    static async findOne() { return null; }
    static collection = { createIndex: async () => {
      if (++attempts === 1) throw Object.assign(new Error('existing duplicates'), { code: 11000 });
    } };
    async save() {}
  }
  const routes = serverWith(User);
  const req = { body: { nickname: 'PandaPipoca07', password: 'test-password' } };
  const first = response(), second = response();
  await routes.get('/register')(req, first);
  assert.equal(first.code, 503);
  await routes.get('/register')(req, second);
  assert.equal(second.code, 201);
  assert.equal(attempts, 2);
});

test('new registration keys have a sparse unique index that tolerates legacy nicknames', () => {
  const User = require('../Schema/User');
  assert.ok(User.schema.indexes().some(([keys, options]) => keys.registrationNickname === 1 && options.unique && options.sparse));
  assert.ok(!User.schema.indexes().some(([keys]) => keys.nickname === 1));
});

test('legacy nicknames remain unavailable even without a registration key', async () => {
  class User {
    static async findOne() { return { nickname: 'PandaPipoca07' }; }
    static collection = { createIndex() { throw new Error('should not reach index creation'); } };
  }
  const routes = serverWith(User);
  const res = response();
  await routes.get('/register')({ body: { nickname: 'PandaPipoca07', password: 'test-password' } }, res);
  assert.equal(res.code, 409);
});

function registrationScreen(fetch, timers = { setTimeout, clearTimeout }) {
  function element() {
    return { value: '', disabled: false, children: [], attrs: {}, events: {},
      classList: { add() {}, remove() {} }, setAttribute(k, v) { this.attrs[k] = v; },
      addEventListener(k, v) { this.events[k] = v; }, replaceChildren() { this.children = []; },
      appendChild(child) { this.children.push(child); }, querySelectorAll() { return this.children; } };
  }
  const ids = Object.fromEntries(['bttn_reg', 'login_reg', 'nomesSugeridos', 'apelidoEscolhido', 'Dice_Name', 'password_reg', 'confirm_password_reg', 'statusCadastro'].map(id => [id, element()]));
  const context = vm.createContext({
    JumpSkyNomes: nomes, API_URL: '', fetch, console, alert() {}, AbortController,
    setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout,
    document: { getElementById: id => ids[id], createElement: element, addEventListener() {} }
  });
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../JS/register.js'), 'utf8'), context);
  return { ids, context };
}

test('screen selection, regeneration, and network failure reset the form safely', async () => {
  let fail = false;
  const { ids, context } = registrationScreen(async (url, options) => {
    if (fail) throw new Error('offline');
    const { candidates } = JSON.parse(options.body);
    return { ok: true, json: async () => ({ available: candidates }) };
  });
  await vm.runInContext('gerarNome()', context);
  const firstNames = ids.nomesSugeridos.children.map(button => button.textContent);
  assert.equal(firstNames.length, 3);
  ids.nomesSugeridos.children[0].events.click();
  assert.equal(ids.bttn_reg.disabled, false);
  assert.equal(ids.nomesSugeridos.children[0].attrs['aria-pressed'], 'true');
  await vm.runInContext('gerarNome()', context);
  assert.ok(ids.nomesSugeridos.children.every(button => !firstNames.includes(button.textContent)));
  assert.equal(ids.login_reg.value, '');
  assert.equal(ids.bttn_reg.disabled, true);
  fail = true;
  await vm.runInContext('gerarNome()', context);
  assert.equal(ids.nomesSugeridos.children.length, 0);
  assert.equal(ids.Dice_Name.disabled, false);
  assert.equal(ids.bttn_reg.disabled, true);
});

test('a registration conflict offers new names and requires another selection', async () => {
  const { ids, context } = registrationScreen(async (url, options) => {
    if (url === '/register') return { ok: false, status: 409, json: async () => ({}) };
    return { ok: true, json: async () => ({ available: JSON.parse(options.body).candidates }) };
  });
  await vm.runInContext('gerarNome()', context);
  ids.nomesSugeridos.children[0].events.click();
  ids.password_reg.value = ids.confirm_password_reg.value = 'test-password';
  await vm.runInContext('createUser({preventDefault(){}})', context);
  assert.equal(ids.login_reg.value, '');
  assert.equal(ids.nomesSugeridos.children.length, 3);
  assert.equal(ids.bttn_reg.disabled, true);
  assert.equal(ids.Dice_Name.disabled, false);
});

test('a pending registration times out, aborts, and unlocks the screen without changing the nickname', async () => {
  let expire;
  let signal;
  const { ids, context } = registrationScreen(async (url, options) => {
    signal = options.signal;
    return new Promise(() => {});
  }, { setTimeout(callback) { expire = callback; return 1; }, clearTimeout() {} });
  ids.login_reg.value = 'PandaPipoca07';
  ids.password_reg.value = ids.confirm_password_reg.value = 'test-password';
  const pending = vm.runInContext('createUser({preventDefault(){}})', context);
  assert.equal(ids.bttn_reg.disabled, true);
  assert.equal(ids.Dice_Name.disabled, true);
  assert.equal(ids.bttn_reg.textContent, 'Criando conta...');
  expire();
  await pending;
  assert.equal(signal.aborted, true);
  assert.equal(ids.bttn_reg.disabled, false);
  assert.equal(ids.Dice_Name.disabled, false);
  assert.equal(ids.login_reg.value, 'PandaPipoca07');
  assert.match(ids.statusCadastro.textContent, /confirmar o cadastro/);
});

test('a response with a pending JSON body also times out', async () => {
  let expire;
  const { ids, context } = registrationScreen(async () => ({ json: () => new Promise(() => {}) }), {
    setTimeout(callback) { expire = callback; return 1; }, clearTimeout() {}
  });
  ids.login_reg.value = 'PandaPipoca07';
  ids.password_reg.value = ids.confirm_password_reg.value = 'test-password';
  const pending = vm.runInContext('createUser({preventDefault(){}})', context);
  await Promise.resolve();
  expire();
  await pending;
  assert.equal(ids.bttn_reg.disabled, false);
});

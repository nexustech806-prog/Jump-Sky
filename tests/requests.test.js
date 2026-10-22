const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = name => fs.readFileSync(path.join(__dirname, '../JS', name), 'utf8');

function screen(fetch, elements = {}) {
    let expire;
    let destination;
    const alerts = [];
    const context = vm.createContext({
        fetch, AbortController, API_URL: '',
        setTimeout(callback) { expire = callback; return 1; }, clearTimeout() {},
        document: { getElementById: id => elements[id], querySelectorAll: () => [] },
        window: { location: { assign: value => { destination = value; } } },
        alert: value => alerts.push(value)
    });
    vm.runInContext(read('request.js'), context);
    return { context, expire: () => expire(), alerts, destination: () => destination };
}

for (const bodyStalls of [false, true]) {
    test(`requests abort and reject when ${bodyStalls ? 'JSON body' : 'connection'} stalls`, async () => {
        let signal;
        const page = screen((url, options) => {
            signal = options.signal;
            return bodyStalls ? Promise.resolve({ json: () => new Promise(() => {}) }) : new Promise(() => {});
        });
        const pending = vm.runInContext("JumpSkyRequest('/slow')", page.context);
        await Promise.resolve();
        page.expire();
        await assert.rejects(pending, error => error.name === 'TimeoutError');
        assert.equal(signal.aborted, true);
    });
}

test('login unlocks the submit button after timeout and prevents duplicate submissions', async () => {
    let submit;
    let requests = 0;
    const elements = {
        form_log: { addEventListener: (_, callback) => { submit = callback; } },
        nickname_log: { value: 'PandaPipoca07' }, password_log: { value: 'password' },
        btn_log: { textContent: 'Entrar e jogar', disabled: false }
    };
    const page = screen(() => { requests++; return new Promise(() => {}); }, elements);
    vm.runInContext(read('login.js'), page.context);
    const pending = submit({ preventDefault() {} });
    await submit({ preventDefault() {} });
    assert.equal(requests, 1);
    assert.equal(elements.btn_log.disabled, true);
    page.expire();
    await pending;
    assert.equal(elements.btn_log.disabled, false);
    assert.equal(elements.btn_log.textContent, 'Entrar e jogar');
    assert.equal(page.destination(), undefined);
    assert.match(page.alerts[0], /tente novamente/i);
});

test('avatar save restores controls and selection after a timeout', async () => {
    const handlers = {};
    const avatar = { dataset: { avatar: 'Personagem.png' }, classList: { add() {}, remove() {} },
        setAttribute() {}, addEventListener: (_, callback) => { handlers.select = callback; } };
    const elements = { continuar: { addEventListener: (_, callback) => { handlers.save = callback; } }, mensagem: {} };
    const page = screen(() => new Promise(() => {}), elements);
    page.context.document.querySelectorAll = () => [avatar];
    vm.runInContext(read('SelecionarAvatar.js'), page.context);
    handlers.select();
    const pending = handlers.save();
    assert.equal(avatar.disabled, true);
    assert.equal(elements.continuar.disabled, true);
    page.expire();
    await pending;
    assert.equal(avatar.disabled, false);
    assert.equal(elements.continuar.disabled, false);
    assert.match(elements.mensagem.textContent, /tente novamente/i);
    assert.equal(page.destination(), undefined);
});

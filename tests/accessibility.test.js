const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadPreferences(saved) {
    const storage = new Map(saved === null ? [] : [['tamanhoFonte', String(saved)]]);
    const buttons = Object.fromEntries(['aumentarFonte', 'diminuirFonte'].map(id => [id, {
        addEventListener(event, handler) { this[event] = handler; }
    }]));
    const document = {
        documentElement: { style: {} },
        body: { classList: { add() {}, toggle() {} } },
        getElementById: id => buttons[id] || null
    };
    const context = vm.createContext({
        document,
        window: { location: { origin: 'http://localhost:4321' } },
        localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)) }
    });
    const run = name => vm.runInContext(fs.readFileSync(path.join(__dirname, '../JS', name), 'utf8'), context);
    return { storage, buttons, document, run };
}

test('font preferences are bounded before rendering and while loading controls', () => {
    for (const [saved, expected] of [[null, 100], [100, 100], [150, 150], [500, 150], [-2, 80], ['Infinity', 100], ['NaN', 100]]) {
        const page = loadPreferences(saved);
        page.run('config.js');
        assert.equal(page.document.documentElement.style.fontSize, `${expected}%`);
        page.run('acessibilidade.js');
        assert.equal(page.document.documentElement.style.fontSize, `${expected}%`);
        assert.equal(page.storage.get('tamanhoFonte'), String(expected));
    }
});

test('both font buttons recover invalid values and stay in the supported range', () => {
    const page = loadPreferences(100);
    page.run('acessibilidade.js');
    page.storage.set('tamanhoFonte', '500');
    page.buttons.diminuirFonte.click();
    assert.equal(page.document.documentElement.style.fontSize, '140%');
    page.storage.set('tamanhoFonte', '-100');
    page.buttons.aumentarFonte.click();
    assert.equal(page.document.documentElement.style.fontSize, '90%');
    for (let i = 0; i < 20; i++) page.buttons.aumentarFonte.click();
    assert.equal(page.document.documentElement.style.fontSize, '150%');
    for (let i = 0; i < 20; i++) page.buttons.diminuirFonte.click();
    assert.equal(page.document.documentElement.style.fontSize, '80%');
    page.storage.set('tamanhoFonte', 'Infinity');
    page.buttons.aumentarFonte.click();
    assert.equal(page.document.documentElement.style.fontSize, '110%');
});

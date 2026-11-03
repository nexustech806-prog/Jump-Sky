const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
for (const [avatar, pose] of [['Personagem.png','per1pulo.png'],['personagem2.png','per2pulo.png'],['personagem3.png','per3pulo.png'],['personagem4.png','per4pulo.png']]) {
    test(avatar + ' uses its jump pose and returns to idle', async () => {
        let observer, jumping = false;
        const requested = [];
        const image = { style: {}, src: '', getAttribute() { return this.src; }, parentElement: { classList: { contains() { return jumping; } } } };
        const context = vm.createContext({
            API_URL: '', console, AbortController, setTimeout, clearTimeout,
            sessionStorage: { getItem: () => avatar, setItem() {} },
            fetch: async () => ({ ok: true, json: async () => ({ avatar }) }),
            MutationObserver: class { constructor(fn) { observer = fn; } observe() {} },
            document: { querySelector: () => image, querySelectorAll: () => [] },
            window: { JumpSkyAssets: { load: async src => { requested.push(src); return true; } } }
        });
        vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '../JS/avatar.js'), 'utf8'), context);
        await context.window.jumpSkyAvatarReady;
        assert.equal(image.src, '/images/' + avatar);
        jumping = true; observer();
        assert.equal(image.src, '/images/' + pose);
        jumping = false; observer();
        assert.equal(image.src, '/images/' + avatar);
        assert.ok(requested.includes('/images/' + pose));
        assert.equal(image.style.visibility, '');
    });
}

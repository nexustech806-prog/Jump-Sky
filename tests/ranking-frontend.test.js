const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const settle = () => new Promise(resolve => setImmediate(resolve));
function screen(filename, request) {
    const elements = new Map();
    function create() {
        return {
            textContent: '', hidden: false, children: [], attributes: {}, listeners: new Map(),
            classList: { toggle() {} },
            addEventListener(type, listener) { this.listeners.set(type, listener); },
            setAttribute(key, value) { this.attributes[key] = value; },
            append(...children) { this.children.push(...children); },
            appendChild(child) { this.children.push(child); },
            replaceChildren(...children) { this.children = children; },
            querySelectorAll() { return this.children; }
        };
    }
    function element(id) {
        if (!elements.has(id)) elements.set(id, create());
        return elements.get(id);
    }
    const context = vm.createContext({
        JumpSkyRequest: request, API_URL: '',
        JumpSkyNomes: { criarGerador: () => () => 'PandaPipoca07' },
        document: { getElementById: element, querySelectorAll: () => [], createElement: create },
        window: { location: { assign() {} } }
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'JS', filename), 'utf8'), context);
    return { element, context };
}

test('live ranking renders real scores and tied positions as text with a safe avatar fallback', async () => {
    const app = screen('ranking.js', async url => {
        assert.equal(url, '/api/ranking');
        return { response: { ok: true }, data: { totalPlayers: 3, players: [
            { position: 1, score: 1200, nickname: '<img src=x onerror=alert(1)>', avatar: '../private' },
            { position: 1, score: 1200, nickname: 'CoalaConfete08', avatar: 'personagem2.png' },
            { position: 3, score: 900, nickname: 'PandaPipoca07', avatar: 'Personagem.png' }
        ] } };
    });
    await settle();
    const rows = app.element('rankingJogadores').children;
    assert.equal(rows.length, 3);
    assert.deepEqual(rows.map(row => row.children[0].textContent), ['1º', '1º', '3º']);
    assert.equal(rows[0].children[1].children[1].textContent, '<img src=x onerror=alert(1)>');
    assert.equal(rows[0].children[1].children[0].src, '/images/Personagem.png');
    assert.equal(rows[0].children[2].children[0].textContent, '1.200');
    assert.equal(app.element('rankingPainel').attributes['aria-busy'], 'false');
});

test('ranking distinguishes an empty community from a request failure and provides a working retry', async () => {
    let attempts = 0;
    const app = screen('ranking.js', async () => {
        attempts++;
        if (attempts === 1) throw new Error('offline');
        return { response: { ok: true }, data: { players: [], totalPlayers: 0 } };
    });
    await settle();
    assert.match(app.element('rankingStatus').textContent, /Não foi possível/);
    assert.equal(app.element('rankingTentarNovamente').hidden, false);
    await app.element('rankingTentarNovamente').listeners.get('click')();
    assert.match(app.element('rankingStatus').textContent, /aventura está começando/);
    assert.equal(app.element('rankingTentarNovamente').hidden, true);
    assert.equal(app.element('rankingJogadores').hidden, true);
});

test('profile remains editable when its ranking fails and can retry ranking independently', async () => {
    let attempts = 0, saves = 0;
    const profile = { avatar: 'Personagem.png', nickname: 'PandaPipoca07', bonusHighScore: 12 };
    const app = screen('perfil.js', async (url, options) => {
        if (url === '/api/profile') {
            if (options.method === 'PUT') saves++;
            return { response: { ok: true }, data: profile };
        }
        assert.equal(url, '/api/ranking/me');
        attempts++;
        if (attempts === 1) throw new Error('offline');
        return { response: { ok: true }, data: { position: 3, score: 12, totalPlayers: 5 } };
    });
    await settle();
    assert.equal(app.element('opcoesPerfil').disabled, false);
    assert.match(app.element('statusPerfil').textContent, /Escolha suas opções/);
    assert.equal(app.element('recarregarRankingPessoal').hidden, false);
    await app.element('formPerfil').listeners.get('submit')({ preventDefault() {} });
    assert.equal(saves, 1);
    assert.match(app.element('statusPerfil').textContent, /Perfil salvo/);
    await app.element('recarregarRankingPessoal').listeners.get('click')();
    assert.equal(app.element('rankingPessoalStatus').textContent, '3ª posição');
    assert.match(app.element('rankingPessoalDetalhe').textContent, /5 aventureiros/);
    assert.equal(app.element('recarregarRankingPessoal').hidden, true);
});

test('a player with no bonus score gets an invitation instead of a fictitious ranking position', async () => {
    const app = screen('perfil.js', async url => ({ response: { ok: true }, data: url === '/api/profile'
        ? { nickname: 'PandaPipoca07', avatar: 'Personagem.png', bonusHighScore: 0 }
        : { position: null, score: 0, totalPlayers: 5 } }));
    await settle();
    assert.match(app.element('rankingPessoalStatus').textContent, /está esperando/);
    assert.match(app.element('rankingPessoalDetalhe').textContent, /primeiros pontos/);
});

test('profile uses the ranked best score when legacy duplicate saves disagree with the profile record', async () => {
    const app = screen('perfil.js', async url => ({ response: { ok: true }, data: url === '/api/profile'
        ? { nickname: 'PandaPipoca07', avatar: 'Personagem.png', bonusHighScore: 0 }
        : { position: 1, score: 1250, totalPlayers: 5 } }));
    await settle();
    assert.equal(app.element('pontosRecordeBonus').textContent, '1.250');
    assert.match(app.element('mensagemRecordeBonus').textContent, /melhor pontuação/);
    assert.equal(app.element('rankingPessoalStatus').textContent, '1ª posição');
});

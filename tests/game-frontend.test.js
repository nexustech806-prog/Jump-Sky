const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const read = name => fs.readFileSync(path.join(__dirname, '..', 'JS', name), 'utf8');
const settle = () => new Promise(resolve => setImmediate(resolve));
const response = (data, ok = true) => ({ ok, json: async () => data });
function deferred() {
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    return { promise, resolve };
}

function game(filename, fetch, storage = new Map()) {
    const elements = new Map(), timeouts = new Map(), intervals = new Map(), events = new Map();
    let timerId = 0;
    function element(id) {
        if (!elements.has(id)) {
            const classes = new Set();
            const listeners = new Map();
            elements.set(id, {
                textContent: '', style: {}, disabled: false, hidden: false, offsetWidth: 60,
                listeners, focus() {},
                addEventListener(name, listener) { listeners.set(name, listener); },
                classList: {
                    add(...names) { names.forEach(name => classes.add(name)); },
                    remove(...names) { names.forEach(name => classes.delete(name)); },
                    contains: name => classes.has(name)
                },
                getBoundingClientRect: () => ({ left: 0, top: 0, bottom: 300, width: 100 })
            });
        }
        return elements.get(id);
    }
    const answers = [0, 1, 2].map(index => element(`answer${index}`));
    const bonusAnswers = [0, 1, 2].map(index => element(`bonusAnswer${index}`));
    const context = vm.createContext({
        API_URL: '', AbortController, console, fetch,
        slugsPorFase: { 2: 'subtraindo-no-subsolo', 3: 'multiplicando-no-oceano', 4: 'dividindo-no-vulcao' },
        playSound() {}, startBackgroundMusic() {}, stopBackgroundMusic() {},
        localStorage: {
            getItem(key) { assert.match(key, /^bonusHighScore:/); return storage.get(key) ?? null; },
            setItem(key, value) { assert.match(key, /^bonusHighScore:/); storage.set(key, value); }
        },
        setTimeout(fn, ms) { const id = ++timerId; timeouts.set(id, { fn, ms }); return id; },
        clearTimeout(id) { timeouts.delete(id); },
        setInterval(fn) { const id = ++timerId; intervals.set(id, fn); return id; },
        clearInterval(id) { intervals.delete(id); },
        window: { location: {}, addEventListener() {} },
        document: {
            getElementById: element,
            querySelector: () => element('scene'),
            querySelectorAll: selector => selector === '.answer-btn' ? answers : bonusAnswers,
            addEventListener(name, listener) { events.set(name, listener); }
        }
    });
    for (const name of ['problems.js', 'game-session.js', filename]) vm.runInContext(read(name), context);
    return {
        context, element, answers, bonusAnswers, intervals, storage,
        event(name) { events.get(name)(); },
        runTimers(ms) {
            for (const [id, timer] of [...timeouts]) {
                if (timer.ms === ms) { timeouts.delete(id); timer.fn(); }
            }
        },
        click(button) { return button.listeners.get('click')(); },
        value(code) { return vm.runInContext(code, context); }
    };
}

const phaseFiles = ['script.js', 'scriptFase2.js', 'scriptFase3.js', 'scriptFase4.js'];
for (const [index, filename] of phaseFiles.entries()) {
    const phase = index + 1;
    test(`phase ${phase} confirms saving and retries without losing correct answers`, async () => {
        const saves = [], unlocks = [];
        let bonusRequests = 0;
        const questions = Array.from({ length: 4 }, (_, i) => ({
            number1: 12 + i, number2: 2, correct: 14 + i, answers: [14 + i, 15 + i, 16 + i]
        }));
        const screen = game(filename, (url, options) => {
            if (url.endsWith('/api/save')) return Promise.resolve(response({ saveProgress: 4, phase4Completed: false }));
            if (url.endsWith('/api/game/start')) return Promise.resolve(response({ challengeToken: 'phase-token', questions }));
            if (url.endsWith('/api/save/avancar')) {
                const pending = deferred();
                saves.push({ pending, payload: JSON.parse(options.body) });
                return pending.promise;
            }
            if (url.endsWith('/api/game/bonus')) {
                bonusRequests++;
                return Promise.resolve(response({ challengeToken: 'bonus-token', question: {
                    number1: 12, number2: 2, correct: 6, answers: [6, 5, 7], operation: '÷'
                } }));
            }
            if (url.endsWith('/api/save/bonus-unlock')) {
                const pending = deferred();
                unlocks.push({ pending, payload: JSON.parse(options.body) });
                return pending.promise;
            }
            throw new Error(`Unexpected request ${url}`);
        });
        assert.ok(screen.answers.every(button => button.disabled));
        await settle();
        for (const question of questions) {
            screen.click(screen.answers.find(button => Number(button.textContent) === question.correct));
            screen.runTimers(1000);
        }
        await settle();
        assert.equal(saves.length, 1);
        assert.equal(screen.element('restartBtn').style.display, 'none');
        assert.equal(bonusRequests, 0);
        assert.match(screen.element('question').textContent, /Salvando/);
        assert.deepEqual(saves[0].payload, {
            faseCompletada: phase, challengeToken: 'phase-token', answers: questions.map(question => question.correct)
        });
        saves[0].pending.resolve(response({ mensagem: 'Falha temporária. Tente novamente.' }, false));
        await settle();
        assert.match(screen.element('restartBtn').textContent, /Tentar salvar/);
        assert.ok(screen.answers.every(button => button.disabled));
        assert.equal(screen.context.window.location.href, undefined);
        screen.click(screen.element('restartBtn'));
        await settle();
        assert.equal(saves.length, 2);
        assert.deepEqual(saves[1].payload, saves[0].payload);
        saves[1].pending.resolve(response({ saveProgress: Math.min(4, phase + 1), phase4Completed: phase === 4 }));
        await settle();
        assert.match(screen.element('question').textContent, /completou a fase/);
        if (phase < 4) {
            screen.click(screen.element('restartBtn'));
            assert.equal(typeof screen.context.window.location.href, 'string');
        } else {
            assert.equal(screen.element('restartBtn').style.display, 'none');
            assert.equal(bonusRequests, 1);
            screen.click(screen.bonusAnswers[0]);
            await settle();
            assert.equal(unlocks.length, 1);
            assert.equal(screen.element('enterBonus').style.display, 'none');
            unlocks[0].pending.resolve(response({ mensagem: 'Tente novamente.' }, false));
            await settle();
            assert.match(screen.element('tryBonusAgain').textContent, /Tentar salvar/);
            screen.click(screen.element('tryBonusAgain'));
            await settle();
            assert.equal(unlocks.length, 2);
            assert.deepEqual(unlocks[1].payload, unlocks[0].payload);
            assert.equal(bonusRequests, 1);
            unlocks[1].pending.resolve(response({ saveProgress: 5, phase4Completed: true }));
            await settle();
            assert.equal(screen.element('enterBonus').style.display, 'inline-block');
        }
    });
}

test('reopening completed phase 4 resumes its locked bonus challenge without replaying questions', async () => {
    const requested = [];
    const screen = game('scriptFase4.js', async url => {
        requested.push(url);
        if (url.endsWith('/api/save')) return response({ saveProgress: 4, phase4Completed: true });
        if (url.endsWith('/api/game/bonus')) return response({ challengeToken: 'resume-token', question: {
            number1: 12, number2: 2, correct: 6, answers: [5, 6, 7], operation: '÷'
        } });
        throw new Error('A completed phase must not generate four more questions');
    });
    await settle();
    assert.deepEqual(requested, ['/api/save', '/api/game/bonus']);
    assert.ok(screen.element('bonusChallenge').classList.contains('show'));
    assert.ok(screen.answers.every(button => button.disabled));
    assert.equal(screen.element('restartBtn').style.display, 'none');
    assert.equal(screen.value('phaseSaved && gameFinished'), true);
    assert.equal(Number(screen.element('hits').textContent), 4);
});

test('phase 4 progress loading failure provides a working load retry', async () => {
    let attempts = 0;
    const screen = game('scriptFase4.js', async url => {
        if (url.endsWith('/api/save')) {
            attempts++;
            return attempts === 1 ? response({ mensagem: 'Tente novamente.' }, false)
                : response({ saveProgress: 4, phase4Completed: true });
        }
        return response({ challengeToken: 'token', question: { number1: 12, number2: 2, correct: 6, answers: [5, 6, 7] } });
    });
    await settle();
    assert.match(screen.element('restartBtn').textContent, /Tentar carregar/);
    screen.click(screen.element('restartBtn'));
    await settle();
    assert.equal(attempts, 2);
    assert.ok(screen.element('bonusChallenge').classList.contains('show'));
});

test('game requests expire even when response JSON ignores abort, and malformed save acknowledgements cannot unlock navigation', async () => {
    let timeout, cleared;
    const context = vm.createContext({
        window: {}, API_URL: '', AbortController,
        createEverydayProblem() {},
        setTimeout(fn) { timeout = fn; return 42; },
        clearTimeout(id) { cleared = id; },
        fetch: async () => ({ ok: true, json: () => new Promise(() => {}) })
    });
    vm.runInContext(read('game-session.js'), context);
    const pending = context.window.JumpSkyGameSession.request('/api/save');
    const timedOut = assert.rejects(pending, /demorou/);
    timeout();
    await timedOut;
    assert.equal(cleared, 42);
    context.fetch = async () => response({});
    await assert.rejects(context.window.JumpSkyGameSession.createPhase(1, '+').complete(), /confirmado/);
    context.fetch = async () => response({ saveProgress: 4, phase4Completed: false });
    await assert.rejects(context.window.JumpSkyGameSession.createPhase(4, '÷').complete(), /confirmado/);
});

test('bonus waits for account record and pauses every question while narration is active', async () => {
    const account = deferred();
    const screen = game('scriptBonus.js', () => account.promise);
    assert.ok(screen.answers.every(button => button.disabled));
    assert.equal(screen.intervals.size, 0);
    screen.event('instructionaudio:start');
    account.resolve(response({ userId: 'child-2', bonusHighScore: 32 }));
    await settle();
    assert.equal(Number(screen.element('highScore').textContent), 32);
    assert.equal(screen.intervals.size, 0);
    screen.event('instructionaudio:end');
    assert.equal(screen.intervals.size, 1);
    screen.event('instructionaudio:start');
    assert.equal(screen.intervals.size, 0);
    const correct = screen.value('questaoAtual.correta');
    screen.click(screen.answers.find(button => Number(button.textContent) === correct));
    screen.runTimers(1000);
    assert.equal(screen.intervals.size, 0);
    screen.event('instructionaudio:end');
    assert.equal(screen.intervals.size, 1);
    assert.equal(Number(screen.element('highScore').textContent), 32);
});

test('bonus record failures remain retryable and a larger score queues behind the pending save', async () => {
    const writes = [];
    const screen = game('scriptBonus.js', (url, options) => {
        if (url.endsWith('/api/save')) return Promise.resolve(response({ userId: 'child-1', bonusHighScore: 0 }));
        const pending = deferred();
        writes.push({ pending, score: JSON.parse(options.body).score });
        return pending.promise;
    });
    await settle();
    screen.value('pontos = 1; verificarRecorde();');
    assert.equal(writes[0].score, 1);
    screen.value('pontos = 2; verificarRecorde();');
    assert.equal(writes.length, 1);
    writes[0].pending.resolve(response({ bonusHighScore: 1 }));
    await settle();
    assert.equal(writes[1].score, 2);
    writes[1].pending.resolve(response({ mensagem: 'Banco indisponível' }, false));
    await settle();
    assert.equal(screen.element('retryRecordSave').hidden, false);
    assert.equal(screen.storage.get('bonusHighScore:child-1'), '2');
    screen.click(screen.element('retryRecordSave'));
    await settle();
    assert.equal(writes[2].score, 2);
    writes[2].pending.resolve(response({ bonusHighScore: 8 }));
    await settle();
    assert.equal(Number(screen.element('highScore').textContent), 8);
    assert.equal(screen.element('retryRecordSave').hidden, true);
    screen.value('pontos = 3; verificarRecorde();');
    assert.equal(writes.length, 3);
});

test('bonus cache merges only the authenticated account and retries its unsaved record after reopening', async () => {
    const storage = new Map([
        ['bonusHighScore', '999'], ['bonusHighScore:child-1', '7'], ['bonusHighScore:child-2', '99']
    ]);
    const writes = [];
    const screen = game('scriptBonus.js', async (url, options) => {
        if (url.endsWith('/api/save')) return response({ userId: 'child-1', bonusHighScore: 2 });
        writes.push(JSON.parse(options.body).score);
        return response({ mensagem: 'Offline' }, false);
    }, storage);
    await settle();
    assert.equal(Number(screen.element('highScore').textContent), 7);
    assert.deepEqual(writes, [7]);
    assert.equal(storage.get('bonusHighScore:child-1'), '7');
    assert.equal(storage.get('bonusHighScore:child-2'), '99');

    const reopened = game('scriptBonus.js', async (url, options) => {
        if (url.endsWith('/api/save')) return response({ userId: 'child-1', bonusHighScore: 2 });
        const score = JSON.parse(options.body).score;
        writes.push(score);
        return response({ bonusHighScore: score });
    }, storage);
    await settle();
    assert.deepEqual(writes, [7, 7]);
    assert.equal(reopened.value('recordeConfirmado'), 7);
    assert.equal(reopened.element('retryRecordSave').hidden, true);
});

test('bonus later scenes reference existing local images', async () => {
    const screen = game('scriptBonus.js', async () => response({ userId: 'child', bonusHighScore: 0 }));
    await settle();
    for (const filename of screen.value('cenarios')) assert.ok(fs.existsSync(path.join(__dirname, '..', filename)));
});

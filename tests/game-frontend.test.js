const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const read = name => fs.readFileSync(path.join(__dirname, '..', 'JS', name), 'utf8');
const settle = () => new Promise(resolve => setImmediate(resolve));
const response = (data, ok = true, status = ok ? 200 : 503) => ({ ok, status, json: async () => data });
function bonusRun(challengeToken = 'run-token', startScore = 0, startLives = 3) {
    return {
        challengeToken, startScore, startLives,
        questions: Array.from({ length: 20 }, (_, index) => ({
            number1: index + 2, number2: 2, operation: '+', correct: index + 4,
            answers: [index + 4, index + 5, index + 6]
        }))
    };
}
function answerCorrect(screen) {
    const correct = screen.value('questaoAtual.correta');
    screen.click(screen.answers.find(button => Number(button.textContent) === correct));
    screen.runTimers(1000);
}
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
    const screen = game('scriptBonus.js', url => url.endsWith('/api/game/bonus-run')
        ? response(bonusRun()) : account.promise);
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
        if (url.endsWith('/api/game/bonus-run')) return Promise.resolve(response(bonusRun()));
        const pending = deferred();
        writes.push({ pending, payload: JSON.parse(options.body) });
        return pending.promise;
    });
    await settle();
    answerCorrect(screen);
    assert.deepEqual(writes[0].payload, { challengeToken: 'run-token', answers: [4], score: 1 });
    answerCorrect(screen);
    assert.equal(writes.length, 1);
    writes[0].pending.resolve(response({ bonusHighScore: 1 }));
    await settle();
    assert.deepEqual(writes[1].payload, { challengeToken: 'run-token', answers: [4, 5], score: 2 });
    writes[1].pending.resolve(response({ mensagem: 'Banco indisponível' }, false));
    await settle();
    assert.equal(screen.element('retryRecordSave').hidden, false);
    assert.deepEqual(JSON.parse(screen.storage.get('bonusHighScore:child-1')).proof, writes[1].payload);
    screen.click(screen.element('retryRecordSave'));
    await settle();
    assert.deepEqual(writes[2].payload, writes[1].payload);
    writes[2].pending.resolve(response({ bonusHighScore: 8 }));
    await settle();
    assert.equal(Number(screen.element('highScore').textContent), 8);
    assert.equal(screen.element('retryRecordSave').hidden, true);
    answerCorrect(screen);
    assert.equal(writes.length, 3);
});

test('bonus cache merges only the authenticated account and retries its unsaved record after reopening', async () => {
    const proof = { challengeToken: 'cached-token', answers: [4, 5, 6, 7, 8, 9, 10], score: 7 };
    const storage = new Map([
        ['bonusHighScore', '999'], ['bonusHighScore:child-1', JSON.stringify({ score: 7, proof })],
        ['bonusHighScore:child-2', '99']
    ]);
    const writes = [];
    const screen = game('scriptBonus.js', async (url, options) => {
        if (url.endsWith('/api/save')) return response({ userId: 'child-1', bonusHighScore: 2 });
        if (url.endsWith('/api/game/bonus-run')) return response(bonusRun());
        writes.push(JSON.parse(options.body));
        return response({ mensagem: 'Offline' }, false);
    }, storage);
    await settle();
    assert.equal(Number(screen.element('highScore').textContent), 7);
    assert.deepEqual(writes, [proof]);
    assert.deepEqual(JSON.parse(storage.get('bonusHighScore:child-1')).proof, proof);
    assert.equal(storage.get('bonusHighScore:child-2'), '99');

    const reopened = game('scriptBonus.js', async (url, options) => {
        if (url.endsWith('/api/save')) return response({ userId: 'child-1', bonusHighScore: 2 });
        if (url.endsWith('/api/game/bonus-run')) return response(bonusRun());
        const submitted = JSON.parse(options.body);
        writes.push(submitted);
        return response({ bonusHighScore: submitted.score });
    }, storage);
    await settle();
    assert.deepEqual(writes, [proof, proof]);
    assert.equal(reopened.value('recordeConfirmado'), 7);
    assert.equal(reopened.element('retryRecordSave').hidden, true);
});

test('bonus discards pre-reset cached proofs and can save a smaller record in the new ranking', async () => {
    for (const generation of [undefined, 0]) {
        const storage = new Map([['bonusHighScore:child', JSON.stringify({
            score: 19, generation, proof: { challengeToken: 'old-run', answers: [4], score: 19 }
        })]]);
        const writes = [];
        const screen = game('scriptBonus.js', async (url, options) => {
            if (url.endsWith('/api/save')) return response({ userId: 'child', bonusHighScore: 0, bonusScoreGeneration: 1 });
            if (url.endsWith('/api/game/bonus-run')) return response(bonusRun('new-run'));
            const proof = JSON.parse(options.body);
            writes.push(proof);
            return response({ bonusHighScore: proof.score });
        }, storage);
        await settle();
        assert.equal(Number(screen.element('highScore').textContent), 0);
        assert.equal(writes.length, 0);
        answerCorrect(screen);
        await settle();
        assert.deepEqual(writes, [{ challengeToken: 'new-run', answers: [4], score: 1 }]);
        assert.equal(Number(screen.element('highScore').textContent), 1);
        assert.deepEqual(JSON.parse(storage.get('bonusHighScore:child')), { score: 1, proof: null, generation: 1 });
    }
});

test('bonus discards a definitively expired cached proof without leaving a permanent save retry', async () => {
    const storage = new Map([['bonusHighScore:child', JSON.stringify({
        generation: 1, score: 7, proof: { challengeToken: 'expired-run', answers: [4], score: 7 }
    })]]);
    const writes = [];
    const screen = game('scriptBonus.js', async (url, options) => {
        if (url.endsWith('/api/save')) return response({ userId: 'child', bonusHighScore: 0, bonusScoreGeneration: 1 });
        if (url.endsWith('/api/game/bonus-run')) return response(bonusRun('new-run'));
        const proof = JSON.parse(options.body);
        writes.push(proof);
        return proof.challengeToken === 'expired-run'
            ? response({ mensagem: 'Partida expirada.' }, false, 400)
            : response({ bonusHighScore: proof.score });
    }, storage);
    await settle();
    assert.equal(Number(screen.element('highScore').textContent), 0);
    assert.equal(screen.element('retryRecordSave').hidden, true);
    assert.equal(JSON.parse(storage.get('bonusHighScore:child')).proof, null);
    answerCorrect(screen);
    await settle();
    assert.deepEqual(writes.at(-1), { challengeToken: 'new-run', answers: [4], score: 1 });
    assert.equal(screen.value('recordeConfirmado'), 1);
});

test('a ranking reset during an open bonus game starts fresh and invalidates old question transitions', async () => {
    let generation = 0, highScore = 2, starts = 0;
    const writes = [];
    const screen = game('scriptBonus.js', async (url, options) => {
        if (url.endsWith('/api/save')) return response({ userId: 'child', bonusHighScore: highScore, bonusScoreGeneration: generation });
        if (url.endsWith('/api/game/bonus-run')) return response(bonusRun(`run-${++starts}`));
        const proof = JSON.parse(options.body);
        writes.push(proof);
        if (proof.challengeToken === 'run-1') return response({ mensagem: 'Ranking reiniciado.' }, false, 400);
        highScore = proof.score;
        return response({ bonusHighScore: highScore });
    });
    await settle();
    answerCorrect(screen);
    answerCorrect(screen);
    generation = 1;
    highScore = 0;
    // Leave this question's delayed transition pending across the reset response.
    const correct = screen.value('questaoAtual.correta');
    screen.click(screen.answers.find(button => Number(button.textContent) === correct));
    await settle();
    assert.equal(starts, 2);
    assert.equal(screen.value('pontos'), 0);
    assert.equal(Number(screen.element('highScore').textContent), 0);
    screen.runTimers(1000);
    assert.equal(screen.value('numeroQuestao'), 1);
    assert.equal(screen.element('retryRecordSave').hidden, true);
    answerCorrect(screen);
    await settle();
    assert.deepEqual(writes.at(-1), { challengeToken: 'run-2', answers: [4], score: 1 });
    assert.equal(screen.value('recordeConfirmado'), 1);
    assert.equal(JSON.parse(screen.storage.get('bonusHighScore:child')).generation, 1);
});

test('bonus ignores unsigned legacy record cache and starts only after a valid signed batch', async () => {
    const storage = new Map([['bonusHighScore:child', '1000000']]);
    let starts = 0;
    const screen = game('scriptBonus.js', async url => {
        if (url.endsWith('/api/save')) return response({ userId: 'child', bonusHighScore: 4 });
        assert.ok(url.endsWith('/api/game/bonus-run'));
        starts++;
        return starts === 1 ? response({ mensagem: 'Offline' }, false) : response(bonusRun());
    }, storage);
    await settle();
    assert.equal(screen.value('recorde'), 4);
    assert.equal(screen.intervals.size, 0);
    assert.ok(screen.answers.every(button => button.disabled));
    assert.equal(screen.element('nextQuestionBtn').hidden, true);
    screen.click(screen.element('retryQuestionBtn'));
    await settle();
    assert.equal(starts, 2);
    assert.equal(screen.intervals.size, 1);
    assert.ok(screen.answers.every(button => !button.disabled));
});

test('bonus timeout retry preserves the signed question and skipping costs no lives or points', async () => {
    const writes = [];
    const screen = game('scriptBonus.js', async (url, options) => {
        if (url.endsWith('/api/save')) return response({ userId: 'child', bonusHighScore: 0 });
        if (url.endsWith('/api/game/bonus-run')) return response(bonusRun());
        const proof = JSON.parse(options.body);
        writes.push(proof);
        return response({ bonusHighScore: proof.score });
    });
    await settle();
    const original = screen.element('question').textContent;
    screen.value('pararTimer(); tempoEsgotado();');
    assert.equal(screen.value('vidas'), 3);
    screen.click(screen.element('retryQuestionBtn'));
    assert.equal(screen.element('question').textContent, original);
    assert.equal(screen.value('bonusAnswers.length'), 0);
    screen.value('pararTimer(); tempoEsgotado();');
    screen.click(screen.element('nextQuestionBtn'));
    assert.equal(screen.value('vidas'), 3);
    assert.equal(screen.value('pontos'), 0);
    answerCorrect(screen);
    await settle();
    assert.deepEqual(writes[0], { challengeToken: 'run-token', answers: [null, 5], score: 1 });
});

test('bonus continues signed batches and can retry loading without losing points or lives', async () => {
    const starts = [];
    const screen = game('scriptBonus.js', async (url, options) => {
        if (url.endsWith('/api/save')) return response({ userId: 'child', bonusHighScore: 100 });
        assert.ok(url.endsWith('/api/game/bonus-run'));
        starts.push(JSON.parse(options.body));
        if (starts.length === 1) return response(bonusRun());
        if (starts.length === 2) return response({ mensagem: 'Offline' }, false);
        return response(bonusRun('next-token', 20, 3));
    });
    await settle();
    for (let index = 0; index < 20; index++) answerCorrect(screen);
    await settle();
    assert.equal(screen.value('pontos'), 20);
    assert.equal(screen.value('vidas'), 3);
    assert.ok(screen.answers.every(button => button.disabled));
    assert.equal(screen.intervals.size, 0);
    screen.click(screen.element('retryQuestionBtn'));
    await settle();
    assert.deepEqual(starts[2], starts[1]);
    assert.deepEqual(starts[1], {
        challengeToken: 'run-token', answers: Array.from({ length: 20 }, (_, index) => index + 4)
    });
    assert.equal(screen.value('bonusChallengeToken'), 'next-token');
    assert.equal(screen.value('pontos'), 20);
    assert.equal(screen.value('vidas'), 3);
    assert.equal(screen.intervals.size, 1);
    assert.ok(screen.answers.every(button => !button.disabled));
});

test('bonus playing again requests a fresh signed run with zero points and three lives', async () => {
    const starts = [];
    const screen = game('scriptBonus.js', async (url, options) => {
        if (url.endsWith('/api/save')) return response({ userId: 'child', bonusHighScore: 100 });
        starts.push(JSON.parse(options.body));
        return response(bonusRun('run-' + starts.length));
    });
    await settle();
    answerCorrect(screen);
    for (let count = 0; count < 3; count++) {
        const correct = screen.value('questaoAtual.correta');
        screen.click(screen.answers.find(button => Number(button.textContent) !== correct));
        screen.runTimers(1500);
    }
    screen.runTimers(1200);
    assert.equal(screen.value('jogoFinalizado'), true);
    screen.click(screen.element('playAgainBtn'));
    await settle();
    assert.deepEqual(starts, [{}, {}]);
    assert.equal(screen.value('pontos'), 0);
    assert.equal(screen.value('vidas'), 3);
    assert.equal(screen.value('bonusChallengeToken'), 'run-2');
});

test('bonus frontend produces records accepted by real signed scoring across batches with lost lives', async () => {
    const { createBonusRun, verifyBonusRun } = require('../lib/bonus-run');
    const secret = 'isolated-frontend-integration-secret';
    const userId = 'child-integration';
    let highScore = 0;
    let continued = false;
    const screen = game('scriptBonus.js', async (url, options) => {
        if (url.endsWith('/api/save')) return response({ userId, bonusHighScore: highScore });
        const payload = JSON.parse(options.body);
        if (url.endsWith('/api/game/bonus-run')) {
            if (!payload.challengeToken) return response(createBonusRun(userId, 2, secret));
            const previous = verifyBonusRun(payload.challengeToken, userId, 2, payload.answers, secret);
            assert.equal(previous.complete, true);
            continued = true;
            return response(createBonusRun(userId, 2, secret, previous.score, previous.lives));
        }
        assert.ok(url.endsWith('/api/save/bonus-record'));
        const verified = verifyBonusRun(payload.challengeToken, userId, 2, payload.answers, secret);
        assert.equal(payload.score, verified.score);
        highScore = Math.max(highScore, verified.score);
        return response({ bonusHighScore: highScore, ...verified });
    });
    await settle();
    for (let index = 0; index < 2; index++) {
        const correct = screen.value('questaoAtual.correta');
        screen.click(screen.answers.find(button => Number(button.textContent) !== correct));
        screen.runTimers(1500);
    }
    for (let index = 0; index < 18; index++) answerCorrect(screen);
    await settle();
    assert.equal(continued, true);
    assert.equal(screen.value('vidas'), 1);
    assert.equal(screen.value('pontos'), 18);
    answerCorrect(screen);
    await settle();
    assert.equal(highScore, 19);
    assert.equal(screen.value('recordeConfirmado'), 19);
});

test('bonus later scenes reference existing local images', async () => {
    const screen = game('scriptBonus.js', async url => response(url.endsWith('/api/game/bonus-run')
        ? bonusRun() : { userId: 'child', bonusHighScore: 0 }));
    await settle();
    for (const filename of screen.value('cenarios')) assert.ok(fs.existsSync(path.join(__dirname, '..', filename)));
});

const { randomInt, randomBytes, createHash } = require('node:crypto');
const jwt = require('jsonwebtoken');
const { createQuestion, verifyChallenge } = require('./game-challenges');

const BATCH_SIZE = 20;
const MAX_SCORE = 1000000;

function scoreGeneration(save) {
    return Number.isSafeInteger(save?.bonusScoreGeneration) && save.bonusScoreGeneration >= 0 ? save.bonusScoreGeneration : 0;
}

function pickupLayout(seed, cycle) {
    const bytes = createHash('sha256').update(`${seed}:${cycle}`).digest();
    const first = 2 + bytes[0] % 3;
    const second = 6 + bytes[1] % 4;
    return { [first]: bytes[2] % 2 ? 'heal' : 'skip', [second]: bytes[2] % 2 ? 'skip' : 'heal' };
}

function createBonusRun(userId, generation, secret, startScore = 0, startLives = 3, startSkips = 0, runSeed = randomBytes(32).toString('hex')) {
    const questions = Array.from({ length: BATCH_SIZE }, (_, index) => {
        const difficulty = Math.min(3, Math.floor((startScore + index) / 5) + 1);
        return createQuestion(randomInt(1, 5), difficulty);
    });
    const challengeToken = jwt.sign({
        purpose: 'bonus-run', userId: String(userId), generation, startScore, startLives, startSkips, runSeed,
        questions: questions.map(question => ({ correct: question.correct, answers: question.answers }))
    }, secret, { algorithm: 'HS256', expiresIn: '7d' });
    const pickupLayouts = {};
    for (let cycle = Math.floor(startScore / 10); cycle <= Math.floor((startScore + BATCH_SIZE) / 10); cycle++) {
        pickupLayouts[cycle] = pickupLayout(runSeed, cycle);
    }
    return { challengeToken, questions, startScore, startLives, startSkips, pickupLayouts };
}

function verifyBonusRun(token, userId, generation, answers, secret) {
    const challenge = verifyChallenge(token, userId, 'bonus-run', secret);
    if (challenge.generation !== generation || !Number.isInteger(challenge.startScore) ||
        challenge.startScore < 0 || challenge.startScore > MAX_SCORE ||
        !Number.isInteger(challenge.startLives) || challenge.startLives < 1 || challenge.startLives > 3 ||
        !Number.isInteger(challenge.startSkips) || challenge.startSkips < 0 || challenge.startSkips > 1 ||
        typeof challenge.runSeed !== 'string' || !/^[a-f0-9]{64}$/.test(challenge.runSeed) ||
        !Array.isArray(challenge.questions) || challenge.questions.length !== BATCH_SIZE ||
        !Array.isArray(answers) || answers.length > BATCH_SIZE) {
        throw new Error('Partida inválida.');
    }
    let score = challenge.startScore;
    let lives = challenge.startLives;
    let skips = challenge.startSkips;
    answers.forEach((entry, index) => {
        if (lives <= 0) throw new Error('A partida já terminou.');
        let answer = entry, timeouts = 0, skip = false;
        if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
            ({ answer, timeouts = 0, skip = false } = entry);
        }
        if (!Number.isInteger(timeouts) || timeouts < 0 || timeouts > 2 || typeof skip !== 'boolean') {
            throw new Error('Tentativa inválida.');
        }
        lives -= timeouts;
        if (lives <= 0) throw new Error('A partida já terminou.');
        if (answer === null) {
            if (skip) {
                if (skips < 1) throw new Error('Nenhum pulo disponível.');
                skips--;
            } else if (timeouts === 0) {
                throw new Error('Pulo sem item ou tempo esgotado.');
            }
            return;
        }
        if (skip) throw new Error('Não é possível responder e pular a mesma questão.');
        const question = challenge.questions[index];
        if (!Number.isInteger(answer) || !question.answers.includes(answer)) throw new Error('Resposta inválida.');
        if (answer === question.correct) {
            score++;
            const pickup = pickupLayout(challenge.runSeed, Math.floor(score / 10))[score % 10];
            if (pickup === 'heal') lives = Math.min(3, lives + 1);
            else if (pickup === 'skip') skips = Math.min(1, skips + 1);
        } else lives--;
    });
    if (score > MAX_SCORE) throw new Error('Pontuação inválida.');
    return { score, lives, skips, runSeed: challenge.runSeed, complete: answers.length === BATCH_SIZE };
}

module.exports = { createBonusRun, verifyBonusRun, scoreGeneration, pickupLayout, BATCH_SIZE };

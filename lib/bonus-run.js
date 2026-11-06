const { randomInt } = require('node:crypto');
const jwt = require('jsonwebtoken');
const { createQuestion, verifyChallenge } = require('./game-challenges');

const BATCH_SIZE = 20;
const MAX_SCORE = 1000000;

function scoreGeneration(save) {
    return Number.isSafeInteger(save?.bonusScoreGeneration) && save.bonusScoreGeneration >= 0 ? save.bonusScoreGeneration : 0;
}

function createBonusRun(userId, generation, secret, startScore = 0, startLives = 3) {
    const questions = Array.from({ length: BATCH_SIZE }, (_, index) => {
        const difficulty = Math.min(3, Math.floor((startScore + index) / 5) + 1);
        return createQuestion(randomInt(1, 5), difficulty);
    });
    const challengeToken = jwt.sign({
        purpose: 'bonus-run', userId: String(userId), generation, startScore, startLives,
        questions: questions.map(question => ({ correct: question.correct, answers: question.answers }))
    }, secret, { algorithm: 'HS256', expiresIn: '7d' });
    return { challengeToken, questions, startScore, startLives };
}

function verifyBonusRun(token, userId, generation, answers, secret) {
    const challenge = verifyChallenge(token, userId, 'bonus-run', secret);
    if (challenge.generation !== generation || !Number.isInteger(challenge.startScore) ||
        challenge.startScore < 0 || challenge.startScore > MAX_SCORE ||
        !Number.isInteger(challenge.startLives) || challenge.startLives < 1 || challenge.startLives > 3 ||
        !Array.isArray(challenge.questions) || challenge.questions.length !== BATCH_SIZE ||
        !Array.isArray(answers) || answers.length > BATCH_SIZE) {
        throw new Error('Partida inválida.');
    }
    let score = challenge.startScore;
    let lives = challenge.startLives;
    answers.forEach((answer, index) => {
        if (lives <= 0) throw new Error('A partida já terminou.');
        // Timing out allows the child to retry the same question. Only choosing
        // to skip consumes a question, without losing a life or a point.
        if (answer === null) return;
        const question = challenge.questions[index];
        if (!Number.isInteger(answer) || !question.answers.includes(answer)) throw new Error('Resposta inválida.');
        if (answer === question.correct) score++;
        else lives--;
    });
    if (score > MAX_SCORE) throw new Error('Pontuação inválida.');
    return { score, lives, complete: answers.length === BATCH_SIZE };
}

module.exports = { createBonusRun, verifyBonusRun, scoreGeneration, BATCH_SIZE };

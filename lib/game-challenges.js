const { randomInt } = require('node:crypto');
const jwt = require('jsonwebtoken');

const OPERATIONS = ['+', '-', '×', '÷'];

function shuffle(values) {
    for (let index = values.length - 1; index > 0; index--) {
        const other = randomInt(index + 1);
        [values[index], values[other]] = [values[other], values[index]];
    }
    return values;
}

function createQuestion(phase, level = 3) {
    const operation = OPERATIONS[phase - 1];
    const random = (min, max) => randomInt(min, max + 1);
    let number1, number2, correct;
    if (phase <= 2) {
        number1 = random(6, [15, 20, 30, 40][level]);
        number2 = random(2, phase === 2 ? number1 : [5, 10, 15, 20][level]);
        correct = phase === 1 ? number1 + number2 : number1 - number2;
    } else if (phase === 3) {
        number1 = random(2, [4, 5, 8, 10][level]);
        number2 = random(2, [5, 6, 8, 10][level]);
        correct = number1 * number2;
    } else {
        number2 = random(2, [4, 5, 8, 10][level]);
        correct = random(2, [5, 6, 8, 10][level]);
        number1 = number2 * correct;
    }
    const distractors = [];
    for (let difference = -7; difference <= 7; difference++) {
        if (difference && correct + difference >= 0) distractors.push(correct + difference);
    }
    return { number1, number2, correct, operation, answers: shuffle([correct, ...shuffle(distractors).slice(0, 2)]) };
}

function createPhaseChallenge(userId, phase, secret) {
    const questions = [];
    for (let level = 0; level < 4; level++) {
        let question;
        do { question = createQuestion(phase, level); }
        while (questions.some(previous => previous.number1 === question.number1 && previous.number2 === question.number2));
        questions.push(question);
    }
    const challengeToken = jwt.sign({
        purpose: 'phase', userId: String(userId), phase,
        answers: questions.map(question => question.correct)
    }, secret, { algorithm: 'HS256', expiresIn: '2h' });
    return { challengeToken, questions };
}

function createBonusChallenge(userId, secret) {
    const question = createQuestion(randomInt(1, 5));
    const challengeToken = jwt.sign({
        purpose: 'bonus', userId: String(userId), answer: question.correct
    }, secret, { algorithm: 'HS256', expiresIn: '2h' });
    return { challengeToken, question };
}

function verifyChallenge(token, userId, purpose, secret) {
    if (typeof token !== 'string') throw new Error('Desafio ausente.');
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
    if (payload.purpose !== purpose || payload.userId !== String(userId)) {
        throw new Error('Desafio inválido para esta conta.');
    }
    return payload;
}

module.exports = { createPhaseChallenge, createBonusChallenge, verifyChallenge };

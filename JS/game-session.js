(function () {
    'use strict';

    async function request(path, options = {}) {
        const controller = new AbortController();
        let timeout;
        try {
            return await Promise.race([
                (async () => {
                    const response = await fetch(`${API_URL}${path}`, {
                        ...options,
                        credentials: 'include',
                        signal: controller.signal,
                        headers: { 'Content-Type': 'application/json', ...options.headers }
                    });
                    let data;
                    try {
                        data = await response.json();
                    } catch (error) {
                        throw new Error('Não foi possível ler a resposta do jogo. Tente novamente.');
                    }
                    if (!response.ok) {
                        throw new Error(data.mensagem || 'Não foi possível comunicar com o jogo. Tente novamente.');
                    }
                    if (!data || typeof data !== 'object') throw new Error('Resposta inválida do jogo. Tente novamente.');
                    return data;
                })(),
                new Promise((resolve, reject) => {
                    timeout = setTimeout(() => {
                        controller.abort();
                        reject(Object.assign(new Error('A conexão demorou. Tente novamente.'), { name: 'AbortError' }));
                    }, 12000);
                })
            ]);
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('A conexão demorou. Tente novamente.');
            }
            throw error;
        } finally {
            clearTimeout(timeout);
        }
    }

    function createPhase(fase, operation) {
        let challengeToken;
        let answers = [];
        return {
            async start() {
                const data = await request('/api/game/start', {
                    method: 'POST', body: JSON.stringify({ fase })
                });
                if (!data.challengeToken || !Array.isArray(data.questions) || data.questions.length !== 4 ||
                    !data.questions.every(question => Number.isInteger(question.number1) &&
                        Number.isInteger(question.number2) && Number.isInteger(question.correct) &&
                        Array.isArray(question.answers) && question.answers.length === 3 &&
                        question.answers.every(Number.isInteger) && question.answers.includes(question.correct))) {
                    throw new Error('Não foi possível carregar as perguntas. Tente novamente.');
                }
                challengeToken = data.challengeToken;
                answers = [];
                return data.questions.map((question, index) => ({
                    ...question,
                    questionText: createEverydayProblem(operation, question.number1, question.number2, index)
                }));
            },
            recordAnswer(answer) {
                answers.push(answer);
            },
            async complete() {
                const data = await request('/api/save/avancar', {
                    method: 'PUT',
                    body: JSON.stringify({ faseCompletada: fase, challengeToken, answers })
                });
                if (!Number.isInteger(data.saveProgress) || data.saveProgress < Math.min(4, fase + 1) ||
                    (fase === 4 && !data.phase4Completed)) {
                    throw new Error('O salvamento ainda não foi confirmado. Tente novamente.');
                }
                return data;
            }
        };
    }

    window.JumpSkyGameSession = { request, createPhase };
}());

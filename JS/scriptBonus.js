// ========================================
// ELEMENTOS DA TELA
// ========================================

const questionElement = document.getElementById("question");
const answerButtons = document.querySelectorAll(".answer-btn");

const livesElement = document.getElementById("lives");
const scoreElement = document.getElementById("score");
const highScoreElement = document.getElementById("highScore");
const recordMessage = document.getElementById("recordMessage");
const questionNumberElement = document.getElementById("questionNumber");
const timerElement = document.getElementById("timer");

const feedback = document.getElementById("feedback");

const scene = document.getElementById("scene");
const sceneName = document.getElementById("sceneName");

const gameOver = document.getElementById("gameOver");
const finalScore = document.getElementById("finalScore");

const playAgainBtn = document.getElementById("playAgainBtn");
const menuBtn = document.getElementById("menuBtn");

const timeoutActions = document.getElementById("timeoutActions");
const retryQuestionBtn = document.getElementById("retryQuestionBtn");
const nextQuestionBtn = document.getElementById("nextQuestionBtn");


// ========================================
// PERSONAGEM E PLATAFORMAS
// ========================================

const character = document.getElementById("character");


const platforms = [
    document.getElementById("platform0"),
    document.getElementById("platform1"),
    document.getElementById("platform2"),
    document.getElementById("platform3"),
    document.getElementById("platform4"),
    document.getElementById("platform5"),
    document.getElementById("platform6"),
    document.getElementById("platform7"),
    document.getElementById("platform8"),
    document.getElementById("platform9")
];

const characterPositions = [
    { left: "58px", bottom: "78px" },
    { left: "173px", bottom: "138px" },
    { left: "293px", bottom: "198px" },
    { left: "413px", bottom: "258px" },
    { left: "533px", bottom: "323px" },
    { left: "663px", bottom: "358px" },
    { left: "783px", bottom: "308px" },
    { left: "893px", bottom: "243px" },
    { left: "993px", bottom: "173px" },
    { left: "1083px", bottom: "98px" }
];


// ========================================
// CONFIGURAÇÕES
// ========================================

const TEMPO_POR_QUESTAO = 45; // Tempo para ler a situação-problema.
const TOTAL_PLATAFORMAS = 10;

const cenarios = [
    "/images/bonus1.jpeg",
    "/images/bonus2.jpeg",
    "/images/bonus1.jpeg",
    "/images/bonus2.jpeg"
];

const nomesCenarios = [
    "🌍 Órbita da Terra",
    "🌙 Viagem pela Lua",
    "🪐 Planetas Distantes",
    "🌌 Espaço Profundo"
];


// ========================================
// VARIÁVEIS DO JOGO
// ========================================

let vidas = 3;
let pontos = 0;
let numeroQuestao = 1;

let recorde = 0;
let recordeConfirmado = 0;
let bonusUserId = null;
let bonusScoreGeneration = 0;
let bonusRunVersion = 0;
let recordSavePending = false;
let bonusReady = false;
let bonusLoadPending = false;
let bonusChallengeToken = null;
let bonusQuestions = [];
let bonusAnswers = [];
let pendingRecordProof = null;
const recordSaveStatus = document.getElementById("recordSaveStatus");
const retryRecordSave = document.getElementById("retryRecordSave");
const retryQuestionLabel = retryQuestionBtn.textContent;

let avisoRecordeMostrado = false;

let tempoRestante = TEMPO_POR_QUESTAO;
let intervaloTimer = null;

let questaoAtual = null;

let jogoFinalizado = false;
let bloqueado = false;

let posicaoPersonagem = 0;
let indiceCenario = 0;


// ========================================
// PREPARA UMA QUESTÃO NA TELA
// ========================================

function exibirQuestaoAtual() {
    bloqueado = false;

    timeoutActions.classList.remove("show");

    feedback.textContent = "";
    feedback.className = "";

    questionElement.textContent =
        questaoAtual.texto;

    answerButtons.forEach(
        (button, index) => {
            button.textContent =
                questaoAtual.respostas[index];

            button.classList.remove(
                "correct",
                "wrong"
            );

            button.disabled = false;
        }
    );

    atualizarInterface();
    atualizarCenario();
    atualizarPersonagem(false);

    iniciarTimer();
}


// ========================================
// CARREGA NOVA QUESTÃO
// ========================================

function carregarQuestao() {
    if (jogoFinalizado) {
        return;
    }

    if (!bonusReady || bonusAnswers.length >= bonusQuestions.length) {
        void initializeBonus();
        return;
    }

    const question = bonusQuestions[bonusAnswers.length];
    questaoAtual = {
        numero1: question.number1,
        numero2: question.number2,
        operacao: question.operation,
        correta: question.correct,
        respostas: question.answers,
        texto: createEverydayProblem(question.operation, question.number1, question.number2)
    };

    exibirQuestaoAtual();
}


// ========================================
// TIMER
// ========================================

function iniciarTimer() {
    pararTimer();
    tempoRestante = TEMPO_POR_QUESTAO;
    timerElement.textContent = tempoRestante;
    resumeTimerWithoutReset();
}

function pararTimer() {
    if (intervaloTimer) {
        clearInterval(
            intervaloTimer
        );

        intervaloTimer = null;
    }
}

let instructionsActive = false;

function resumeTimerWithoutReset() {
    if (intervaloTimer || jogoFinalizado || bloqueado || instructionsActive || !bonusReady) return;
    intervaloTimer = setInterval(() => {
        tempoRestante--;
        timerElement.textContent = tempoRestante;
        if (tempoRestante <= 0) {
            pararTimer();
            tempoEsgotado();
        }
    }, 1000);
}

document.addEventListener("instructionaudio:start", () => {
    instructionsActive = true;
    pararTimer();
});

document.addEventListener("instructionaudio:end", () => {
    instructionsActive = false;
    resumeTimerWithoutReset();
});


// ========================================
// TEMPO ESGOTADO
// ========================================

function tempoEsgotado() {

    if (
        bloqueado ||
        jogoFinalizado
    ) {
        return;
    }

    playSound("timeout");

    bloqueado = true;

    answerButtons.forEach(
        button => {
            button.disabled = true;

            if (
                Number(button.textContent) ===
                questaoAtual.correta
            ) {
                button.classList.add("correct");
            }
        }
    );

    /*
        O TEMPO ESGOTADO NÃO GERA PUNIÇÃO.

        - Não perde vida
        - Não perde pontos
        - Não perde progresso
        - Não altera a plataforma atual
    */

    feedback.textContent =
        `⏰ O tempo acabou! A resposta correta era ${questaoAtual.correta}. Você pode tentar esta operação novamente ou seguir para a próxima.`;

    feedback.className =
        "feedback-wrong";

    atualizarInterface();

    /*
        Não avançamos automaticamente.

        O jogador escolhe:
        - tentar a mesma questão novamente;
        - seguir para uma nova questão.
    */

    timeoutActions.classList.add("show");
}


// ========================================
// TENTA A MESMA QUESTÃO NOVAMENTE
// ========================================

function tentarQuestaoNovamente() {
    if (!bonusReady) {
        void initializeBonus();
        return;
    }

    if (
        jogoFinalizado ||
        vidas <= 0
    ) {
        return;
    }

    /*
        Mantém exatamente a mesma operação,
        não altera o número da questão
        e não movimenta o personagem.

        O timer volta aos 45 segundos.
    */

    exibirQuestaoAtual();
}


// ========================================
// SEGUE APÓS O TEMPO ESGOTADO
// ========================================

function seguirParaProximaQuestao() {
    if (
        !bonusReady ||
        !timeoutActions.classList.contains("show") ||
        jogoFinalizado ||
        vidas <= 0
    ) {
        return;
    }

    timeoutActions.classList.remove("show");
    bonusAnswers.push(null); // Pular após o tempo acabar não tira uma vida.
    proximaQuestao();
}


// ========================================
// VERIFICA RESPOSTA
// ========================================

function verificarResposta(button) {
    if (
        !bonusReady ||
        bloqueado ||
        jogoFinalizado
    ) {
        return;
    }

    bloqueado = true;

    pararTimer();

    const respostaJogador =
        Number(
            button.textContent
        );

    answerButtons.forEach(
        btn => {
            btn.disabled = true;
        }
    );
    bonusAnswers.push(respostaJogador);

    if (
    respostaJogador ===
    questaoAtual.correta
) {

    playSound("correct");

    button.classList.add(
        "correct"
    );

        pontos++;

        verificarRecorde();

        feedback.textContent =
            "🎉 Muito bem! Resposta correta!";

        feedback.className =
            "feedback-correct";

        atualizarInterface();

        avancarPersonagem();

        agendarTransicao(
            proximaQuestao,
            1000
        );
    }

    else {

    playSound("wrong");

    button.classList.add(
        "wrong"
    );

        answerButtons.forEach(
            btn => {
                if (
                    Number(btn.textContent) ===
                    questaoAtual.correta
                ) {
                    btn.classList.add(
                        "correct"
                    );
                }
            }
        );

        /*
            Resposta errada continua
            causando perda de uma vida.
        */

        vidas--;

        feedback.textContent =
            `💡 Quase! A resposta correta era ${questaoAtual.correta}.`;

        feedback.className =
            "feedback-wrong";

        atualizarInterface();

        if (vidas <= 0) {
            agendarTransicao(
                finalizarJogo,
                1200
            );

            return;
        }

        agendarTransicao(
            proximaQuestao,
            1500
        );
    }
}


// ========================================
// PRÓXIMA QUESTÃO
// ========================================

function agendarTransicao(callback, delay) {
    const version = bonusRunVersion;
    setTimeout(() => {
        if (version === bonusRunVersion) callback();
    }, delay);
}

function proximaQuestao() {
    if (jogoFinalizado) {
        return;
    }

    numeroQuestao++;

    carregarQuestao();
}


// ========================================
// AVANÇA O PERSONAGEM
// ========================================

function avancarPersonagem() {
    if (
        posicaoPersonagem <
        TOTAL_PLATAFORMAS - 1
    ) {
        posicaoPersonagem++;

        atualizarPersonagem(true);

        return;
    }

    indiceCenario++;

    if (
        indiceCenario >=
        cenarios.length
    ) {
        indiceCenario = 0;
    }

    posicaoPersonagem = 0;

    atualizarCenario();
    atualizarPersonagem(false);
}


// ========================================
// ATUALIZA CENÁRIO
// ========================================

function atualizarCenario() {
    scene.style.backgroundImage =
        `url("${cenarios[indiceCenario]}")`;

    if (sceneName) {
        sceneName.textContent =
            nomesCenarios[indiceCenario];
    }
}


// ========================================
// ATUALIZA PERSONAGEM E PLATAFORMAS
// ========================================

function atualizarPersonagem(fazerPulo = false) {
    const platform = platforms[posicaoPersonagem];

    if (!platform || !scene || !character) {
        return;
    }

    platforms.forEach(
        (item, index) => {
            if (!item) {
                return;
            }

            item.classList.remove(
                "current",
                "completed"
            );

            if (index < posicaoPersonagem) {
                item.classList.add("completed");
            }

            if (index === posicaoPersonagem) {
                item.classList.add("current");
            }
        }
    );

    if (fazerPulo) {
        character.classList.remove("jumping");
        void character.offsetWidth;
        character.classList.add("jumping");
    }

    const platformRect = platform.getBoundingClientRect();
    const sceneRect = scene.getBoundingClientRect();

    const left =
        platformRect.left -
        sceneRect.left +
        (platformRect.width / 2) -
        (character.offsetWidth / 2);

    const bottom =
        sceneRect.bottom -
        platformRect.top;

    character.style.left = `${left}px`;
    character.style.bottom = `${bottom}px`;

    setTimeout(
        () => {
            character.classList.remove("jumping");
        },
        650
    );
}


// ========================================
// SISTEMA DE RECORDE
// ========================================

function validRecordProof(proof) {
    return proof && typeof proof.challengeToken === "string" && proof.challengeToken.length > 0 &&
        Array.isArray(proof.answers) && proof.answers.length > 0 && proof.answers.length <= 20 &&
        proof.answers.every(answer => answer === null || Number.isInteger(answer)) &&
        Number.isInteger(proof.score) && proof.score > 0 && proof.score <= 1000000;
}

async function initializeBonus() {
    if (bonusLoadPending) return;
    bonusLoadPending = true;
    bonusReady = false;
    pararTimer();
    answerButtons.forEach(button => { button.disabled = true; });
    questionElement.textContent = "Preparando seu próximo desafio...";
    timeoutActions.classList.remove("show");
    try {
        if (!bonusUserId) {
            const data = await window.JumpSkyGameSession.request("/api/save");
            if (!data.userId || !Number.isInteger(data.bonusHighScore) || data.bonusHighScore < 0) {
                throw new Error("Não foi possível carregar seu recorde. Tente novamente.");
            }
            bonusUserId = data.userId;
            bonusScoreGeneration = data.bonusScoreGeneration ?? 0;
            recordeConfirmado = data.bonusHighScore;
            recorde = recordeConfirmado;
            try {
                const cached = JSON.parse(localStorage.getItem("bonusHighScore:" + bonusUserId));
                // Um número salvo nas versões antigas não comprova uma partida.
                if (cached && (cached.generation ?? 0) === bonusScoreGeneration &&
                    validRecordProof(cached.proof) && cached.proof.score > recordeConfirmado) {
                    pendingRecordProof = cached.proof;
                    recorde = pendingRecordProof.score;
                }
            } catch (error) {
                // O recorde da conta funciona mesmo com o armazenamento desativado.
            }
            cacheRecord();
            void salvarRecorde();
        }
        const continuation = bonusChallengeToken ? {
            challengeToken: bonusChallengeToken, answers: bonusAnswers.slice()
        } : {};
        const data = await window.JumpSkyGameSession.request("/api/game/bonus-run", {
            method: "POST", body: JSON.stringify(continuation)
        });
        if (!data.challengeToken || !Array.isArray(data.questions) || data.questions.length !== 20 ||
            data.startScore !== pontos || data.startLives !== vidas ||
            !data.questions.every(question => Number.isInteger(question.number1) &&
                Number.isInteger(question.number2) && Number.isInteger(question.correct) &&
                ["+", "-", "×", "÷"].includes(question.operation) &&
                Array.isArray(question.answers) && question.answers.length === 3 &&
                question.answers.every(Number.isInteger) && new Set(question.answers).size === 3 &&
                question.answers.includes(question.correct))) {
            throw new Error("Não foi possível preparar as perguntas. Tente novamente.");
        }
        bonusChallengeToken = data.challengeToken;
        bonusQuestions = data.questions;
        bonusAnswers = [];
        bonusReady = true;
        nextQuestionBtn.hidden = false;
        retryQuestionBtn.textContent = retryQuestionLabel;
        carregarQuestao();
    } catch (error) {
        questionElement.textContent = "Vamos tentar conectar novamente?";
        feedback.textContent = error.message;
        feedback.className = "feedback-wrong";
        retryQuestionBtn.textContent = "Tentar conectar novamente";
        nextQuestionBtn.hidden = true;
        timeoutActions.classList.add("show");
        retryQuestionBtn.focus();
    } finally {
        bonusLoadPending = false;
    }
}

function cacheRecord() {
    if (!bonusUserId) return;
    try {
        localStorage.setItem("bonusHighScore:" + bonusUserId, JSON.stringify({
            score: recorde, proof: pendingRecordProof, generation: bonusScoreGeneration
        }));
    } catch (error) {
        // Saving to the authenticated account still works without local storage.
    }
}

async function salvarRecorde() {
    if (recordSavePending || !pendingRecordProof || !bonusUserId) return;
    recordSavePending = true;
    retryRecordSave.hidden = true;
    recordSaveStatus.textContent = "Salvando seu recorde...";
    let submittedProof;
    let rejected = false;
    try {
        while (pendingRecordProof && pendingRecordProof.score > recordeConfirmado) {
            const proof = pendingRecordProof;
            submittedProof = proof;
            const data = await window.JumpSkyGameSession.request("/api/save/bonus-record", {
                method: "PUT", keepalive: true, body: JSON.stringify(proof)
            });
            if (!Number.isInteger(data.bonusHighScore) || data.bonusHighScore < proof.score) {
                throw new Error("O recorde ainda não foi confirmado.");
            }
            recordeConfirmado = Math.max(recordeConfirmado, data.bonusHighScore);
            recorde = Math.max(recorde, recordeConfirmado);
            if (pendingRecordProof.score <= recordeConfirmado) pendingRecordProof = null;
            cacheRecord();
            highScoreElement.textContent = recorde;
        }
        recordSaveStatus.textContent = "Recorde salvo na sua conta.";
    } catch (error) {
        if (error.status === 400 || error.status === 403) {
            rejected = true;
            await descartarRecordeInvalido(submittedProof);
            return;
        }
        recordSaveStatus.textContent = "Não foi possível salvar seu recorde. Tente novamente antes de sair.";
        retryRecordSave.hidden = false;
    } finally {
        recordSavePending = false;
        if (rejected && pendingRecordProof) void salvarRecorde();
    }
}

async function descartarRecordeInvalido(proof) {
    // A rejected or expired proof cannot succeed on retry. Keep a newer proof
    // from the current game, but never let an old cached score hide new records.
    if (pendingRecordProof === proof) pendingRecordProof = null;
    recorde = Math.max(recordeConfirmado, pendingRecordProof?.score || 0);
    cacheRecord();
    highScoreElement.textContent = recorde;
    retryRecordSave.hidden = true;
    recordSaveStatus.textContent = "Esta partida não vale mais para o ranking. Seus próximos pontos podem formar um novo recorde.";
    try {
        const data = await window.JumpSkyGameSession.request("/api/save");
        if (data.userId !== bonusUserId || !Number.isInteger(data.bonusHighScore) || data.bonusHighScore < 0) {
            throw new Error("Recorde inválido.");
        }
        const generation = data.bonusScoreGeneration ?? 0;
        const reset = generation !== bonusScoreGeneration;
        const restart = reset || proof?.challengeToken === bonusChallengeToken;
        bonusScoreGeneration = generation;
        recordeConfirmado = data.bonusHighScore;
        if (restart) pendingRecordProof = null;
        recorde = Math.max(recordeConfirmado, pendingRecordProof?.score || 0);
        cacheRecord();
        highScoreElement.textContent = recorde;
        if (restart) {
            reiniciarJogo();
            recordSaveStatus.textContent = reset
                ? "O ranking recomeçou! Sua nova partida começa com zero pontos."
                : "Vamos começar uma nova partida para salvar seus próximos pontos.";
        }
    } catch (error) {
        // The invalid proof has already been removed. A later fresh attempt
        // can reconnect without restoring it from this browser's cache.
        recordSaveStatus.textContent = "Esta partida não vale mais para o ranking. Reabra a fase para carregar seu recorde atual.";
    }
}

retryRecordSave.addEventListener("click", () => { void salvarRecorde(); });

function verificarRecorde() {
    if (pontos <= recorde) {
        return;
    }

    recorde = pontos;
    pendingRecordProof = {
        challengeToken: bonusChallengeToken, answers: bonusAnswers.slice(), score: pontos
    };

    cacheRecord();
    void salvarRecorde();

    highScoreElement.textContent =
        recorde;

    if (!avisoRecordeMostrado) {

    playSound("record");

    avisoRecordeMostrado = true;

    recordMessage.textContent =
        "🏆 NOVO RECORDE!";

        recordMessage.classList.add(
            "new-record"
        );

        setTimeout(
            () => {
                recordMessage.textContent =
                    "";

                recordMessage.classList.remove(
                    "new-record"
                );
            },
            2000
        );
    }
}


// ========================================
// ATUALIZA INFORMAÇÕES
// ========================================

function atualizarInterface() {
    livesElement.textContent =
        vidas;

    scoreElement.textContent =
        pontos;

    highScoreElement.textContent =
        recorde;

    questionNumberElement.textContent =
        numeroQuestao;
}


// ========================================
// FINALIZA O JOGO
// ========================================

function finalizarJogo() {
    stopBackgroundMusic();
    jogoFinalizado = true;

    pararTimer();

    timeoutActions.classList.remove("show");

    answerButtons.forEach(
        button => {
            button.disabled = true;
        }
    );
    playSound("timeout");

    questionElement.textContent =
        "🚀 Fim do desafio!";

    feedback.textContent =
        "Você perdeu suas 3 vidas, mas seu progresso nas fases principais continua salvo!";

    feedback.className =
        "feedback-wrong";

    finalScore.textContent =
        pontos;
    void salvarRecorde();

    gameOver.style.display =
        "block";
}


// ========================================
// REINICIA O JOGO
// ========================================

function reiniciarJogo() {
    bonusRunVersion++;
    startBackgroundMusic();
    pararTimer();

    vidas = 3;
    pontos = 0;
    numeroQuestao = 1;

    avisoRecordeMostrado = false;
    recordMessage.textContent = "";
    recordMessage.classList.remove("new-record");

    posicaoPersonagem = 0;
    indiceCenario = 0;

    tempoRestante =
        TEMPO_POR_QUESTAO;

    jogoFinalizado = false;
    bloqueado = false;

    timeoutActions.classList.remove("show");

    gameOver.style.display =
        "none";

    atualizarCenario();
    atualizarPersonagem(false);

    bonusReady = false;
    bonusChallengeToken = null;
    bonusQuestions = [];
    bonusAnswers = [];
    void initializeBonus();
}


// ========================================
// EVENTOS
// ========================================

answerButtons.forEach(
    button => {
        button.addEventListener(
            "click",
            () => {
                verificarResposta(
                    button
                );
            }
        );
    }
);

retryQuestionBtn.addEventListener(
    "click",
    tentarQuestaoNovamente
);

nextQuestionBtn.addEventListener(
    "click",
    seguirParaProximaQuestao
);

playAgainBtn.addEventListener(
    "click",
    reiniciarJogo
);

menuBtn.addEventListener(
    "click",
    () => {
        pararTimer();

        window.location.href =
            "/menu";
    }
);


// ========================================
// INICIA A FASE BÔNUS
// ========================================

atualizarCenario();
atualizarPersonagem(false);
void initializeBonus();

// Mantém o personagem alinhado à plataforma após resize/zoom.
window.addEventListener("resize", () => atualizarPersonagem(false));

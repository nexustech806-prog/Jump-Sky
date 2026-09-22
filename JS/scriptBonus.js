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

const TEMPO_POR_QUESTAO = 15;
const TOTAL_PLATAFORMAS = 10;

const cenarios = [
    "/images/bonus1.jpeg",
    "/images/bonus2.jpeg",
    "/images/bonus3.jpeg",
    "/images/bonus4.jpeg"
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

let recorde =
    Number(
        localStorage.getItem("bonusHighScore")
    ) || 0;

let avisoRecordeMostrado = false;

let tempoRestante = TEMPO_POR_QUESTAO;
let intervaloTimer = null;

let questaoAtual = null;

let jogoFinalizado = false;
let bloqueado = false;

let posicaoPersonagem = 0;
let indiceCenario = 0;


// ========================================
// FUNÇÕES AUXILIARES
// ========================================

function numeroAleatorio(min, max) {
    return Math.floor(
        Math.random() * (max - min + 1)
    ) + min;
}

function embaralhar(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(
            Math.random() * (i + 1)
        );

        [array[i], array[j]] =
            [array[j], array[i]];
    }

    return array;
}

function obterDificuldade() {
    return Math.floor(pontos / 5) + 1;
}


// ========================================
// GERA QUESTÃO
// ========================================

function gerarQuestao() {
    const dificuldade =
        obterDificuldade();

    const operacoes = [
        "+",
        "-",
        "×",
        "÷"
    ];

    const operacao =
        operacoes[
            numeroAleatorio(
                0,
                operacoes.length - 1
            )
        ];

    let numero1;
    let numero2;
    let resposta;

    if (operacao === "+") {
        const maximo =
            10 + (dificuldade * 5);

        numero1 =
            numeroAleatorio(1, maximo);

        numero2 =
            numeroAleatorio(1, maximo);

        resposta =
            numero1 + numero2;
    }

    else if (operacao === "-") {
        const maximo =
            10 + (dificuldade * 5);

        numero1 =
            numeroAleatorio(2, maximo);

        numero2 =
            numeroAleatorio(1, numero1);

        resposta =
            numero1 - numero2;
    }

    else if (operacao === "×") {
        const maximo =
            5 + (dificuldade * 2);

        numero1 =
            numeroAleatorio(2, maximo);

        numero2 =
            numeroAleatorio(2, maximo);

        resposta =
            numero1 * numero2;
    }

    else {
        const maximoDivisor =
            4 + dificuldade;

        const maximoResposta =
            5 + (dificuldade * 2);

        numero2 =
            numeroAleatorio(
                2,
                maximoDivisor
            );

        resposta =
            numeroAleatorio(
                2,
                maximoResposta
            );

        numero1 =
            numero2 * resposta;
    }

    const respostas =
        gerarRespostas(resposta);

    return {
        numero1,
        numero2,
        operacao,
        correta: resposta,
        respostas,
        texto:
            `Quanto é ${numero1} ${operacao} ${numero2}?`
    };
}


// ========================================
// GERA EXATAMENTE 3 RESPOSTAS
// ========================================

function gerarRespostas(correta) {
    const respostas =
        new Set();

    respostas.add(correta);

    const variacao =
        Math.max(
            3,
            Math.ceil(
                Math.abs(correta) * 0.15
            )
        );

    while (respostas.size < 3) {
        const errada =
            correta +
            numeroAleatorio(
                -variacao,
                variacao
            );

        if (errada === correta) {
            continue;
        }

        if (errada < 0) {
            continue;
        }

        respostas.add(errada);
    }

    return embaralhar(
        [...respostas]
    );
}


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

    questaoAtual =
        gerarQuestao();

    exibirQuestaoAtual();
}


// ========================================
// TIMER
// ========================================

function iniciarTimer() {
    pararTimer();

    tempoRestante =
        TEMPO_POR_QUESTAO;

    timerElement.textContent =
        tempoRestante;

    intervaloTimer =
        setInterval(
            () => {
                tempoRestante--;

                timerElement.textContent =
                    tempoRestante;

                if (tempoRestante <= 0) {
                    pararTimer();
                    tempoEsgotado();
                }
            },
            1000
        );
}

function pararTimer() {
    if (intervaloTimer) {
        clearInterval(
            intervaloTimer
        );

        intervaloTimer = null;
    }
}


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

    vidas--;

    feedback.textContent =
        `⏰ O tempo acabou! A resposta correta era ${questaoAtual.correta}. Você pode tentar esta operação novamente ou seguir para a próxima.`;

    feedback.className =
        "feedback-wrong";

    atualizarInterface();

    /*
        Se esta foi a terceira vida perdida,
        a partida termina normalmente.
    */
    if (vidas <= 0) {
        setTimeout(
            finalizarJogo,
            1200
        );

        return;
    }

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

        O timer volta a 15 segundos.
    */
    exibirQuestaoAtual();
}


// ========================================
// SEGUE APÓS O TEMPO ESGOTADO
// ========================================

function seguirParaProximaQuestao() {
    if (
        jogoFinalizado ||
        vidas <= 0
    ) {
        return;
    }

    timeoutActions.classList.remove("show");

    proximaQuestao();
}


// ========================================
// VERIFICA RESPOSTA
// ========================================

function verificarResposta(button) {
    if (
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

    if (
        respostaJogador ===
        questaoAtual.correta
    ) {
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

        setTimeout(
            proximaQuestao,
            1000
        );
    }

    else {
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

        vidas--;

        feedback.textContent =
            `💡 Quase! A resposta correta era ${questaoAtual.correta}.`;

        feedback.className =
            "feedback-wrong";

        atualizarInterface();

        if (vidas <= 0) {
            setTimeout(
                finalizarJogo,
                1200
            );

            return;
        }

        setTimeout(
            proximaQuestao,
            1500
        );
    }
}


// ========================================
// PRÓXIMA QUESTÃO
// ========================================

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
    const destino =
        characterPositions[
            posicaoPersonagem
        ];

    if (!destino) {
        return;
    }

    platforms.forEach(
        (platform, index) => {
            if (!platform) {
                return;
            }

            platform.classList.remove(
                "current",
                "completed"
            );

            if (
                index <
                posicaoPersonagem
            ) {
                platform.classList.add(
                    "completed"
                );
            }

            if (
                index ===
                posicaoPersonagem
            ) {
                platform.classList.add(
                    "current"
                );
            }
        }
    );

    if (fazerPulo) {
        character.classList.remove(
            "jumping"
        );

        void character.offsetWidth;

        character.classList.add(
            "jumping"
        );
    }

    character.style.left =
        destino.left;

    character.style.bottom =
        destino.bottom;

    setTimeout(
        () => {
            character.classList.remove(
                "jumping"
            );
        },
        650
    );
}


// ========================================
// SISTEMA DE RECORDE
// ========================================

function verificarRecorde() {
    if (pontos <= recorde) {
        return;
    }

    recorde = pontos;

    localStorage.setItem(
        "bonusHighScore",
        recorde
    );

    highScoreElement.textContent =
        recorde;

    if (!avisoRecordeMostrado) {
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
    jogoFinalizado = true;

    pararTimer();

    timeoutActions.classList.remove("show");

    answerButtons.forEach(
        button => {
            button.disabled = true;
        }
    );

    questionElement.textContent =
        "🚀 Fim do desafio!";

    feedback.textContent =
        "Você perdeu suas 3 vidas, mas seu progresso nas fases principais continua salvo!";

    feedback.className =
        "feedback-wrong";

    finalScore.textContent =
        pontos;

    gameOver.style.display =
        "block";
}


// ========================================
// REINICIA O JOGO
// ========================================

function reiniciarJogo() {
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

    carregarQuestao();
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
carregarQuestao();

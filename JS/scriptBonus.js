// ========================================
// ELEMENTOS DA TELA
// ========================================

const questionElement = document.getElementById("question");
const answerButtons = document.querySelectorAll(".answer-btn");

const livesElement = document.getElementById("lives");
const scoreElement = document.getElementById("score");
const questionNumberElement = document.getElementById("questionNumber");
const timerElement = document.getElementById("timer");

const feedback = document.getElementById("feedback");

const scene = document.getElementById("scene");
const sceneName = document.getElementById("sceneName");

const gameOver = document.getElementById("gameOver");
const finalScore = document.getElementById("finalScore");

const playAgainBtn = document.getElementById("playAgainBtn");
const menuBtn = document.getElementById("menuBtn");


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

/*
    IMPORTANTE:
    mantenha aqui os nomes reais das imagens
    que você já colocou no seu projeto.
*/
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

let tempoRestante = TEMPO_POR_QUESTAO;
let intervaloTimer = null;

let questaoAtual = null;

let jogoFinalizado = false;
let bloqueado = false;

// Posição atual do personagem: 0 até 9
let posicaoPersonagem = 0;

// Cenário atual
let indiceCenario = 0;


// ========================================
// NÚMERO ALEATÓRIO
// ========================================

function numeroAleatorio(min, max) {
    return Math.floor(
        Math.random() * (max - min + 1)
    ) + min;
}


// ========================================
// EMBARALHA ARRAY
// ========================================

function embaralhar(array) {

    for (let i = array.length - 1; i > 0; i--) {

        const j =
            Math.floor(
                Math.random() * (i + 1)
            );

        [array[i], array[j]] =
            [array[j], array[i]];
    }

    return array;
}


// ========================================
// DIFICULDADE INFINITA
// ========================================

function obterDificuldade() {

    /*
        A cada 5 pontos a dificuldade aumenta.

        0 - 4   = nível 1
        5 - 9   = nível 2
        10 - 14 = nível 3
        ...

        Não existe limite máximo.
    */

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


    // ========================================
    // ADIÇÃO
    // ========================================

    if (operacao === "+") {

        const maximo =
            10 + (dificuldade * 5);

        numero1 =
            numeroAleatorio(
                1,
                maximo
            );

        numero2 =
            numeroAleatorio(
                1,
                maximo
            );

        resposta =
            numero1 + numero2;
    }


    // ========================================
    // SUBTRAÇÃO
    // ========================================

    else if (operacao === "-") {

        const maximo =
            10 + (dificuldade * 5);

        numero1 =
            numeroAleatorio(
                2,
                maximo
            );

        numero2 =
            numeroAleatorio(
                1,
                numero1
            );

        resposta =
            numero1 - numero2;
    }


    // ========================================
    // MULTIPLICAÇÃO
    // ========================================

    else if (operacao === "×") {

        /*
            Multiplicação cresce mais devagar
            para não gerar números gigantes
            muito rapidamente.
        */

        const maximo =
            5 + (dificuldade * 2);

        numero1 =
            numeroAleatorio(
                2,
                maximo
            );

        numero2 =
            numeroAleatorio(
                2,
                maximo
            );

        resposta =
            numero1 * numero2;
    }


    // ========================================
    // DIVISÃO
    // ========================================

    else {

        /*
            A divisão sempre terá
            resultado inteiro/exato.
        */

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
        numero1: numero1,
        numero2: numero2,
        operacao: operacao,
        correta: resposta,
        respostas: respostas,

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
// CARREGA NOVA QUESTÃO
// ========================================

function carregarQuestao() {

    if (jogoFinalizado) {
        return;
    }

    bloqueado = false;

    feedback.textContent = "";
    feedback.className = "";

    questaoAtual =
        gerarQuestao();

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


// ========================================
// PARA O TIMER
// ========================================

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
        }
    );

    // Perde uma vida
    vidas--;

    /*
        NÃO alteramos posicaoPersonagem.

        Portanto, se o tempo acabar,
        o personagem permanece exatamente
        onde está.
    */

    feedback.textContent =
        `⏰ O tempo acabou! A resposta era ${questaoAtual.correta}.`;

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

    // Para imediatamente ao responder
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


    // ========================================
    // ACERTO
    // ========================================

    if (
        respostaJogador ===
        questaoAtual.correta
    ) {

        button.classList.add(
            "correct"
        );

        pontos++;

        feedback.textContent =
            "🎉 Muito bem! Resposta correta!";

        feedback.className =
            "feedback-correct";

        atualizarInterface();

        /*
            SOMENTE ACERTO chama a função
            que avança o personagem.
        */

        avancarPersonagem();

        setTimeout(
            proximaQuestao,
            1000
        );
    }


    // ========================================
    // ERRO
    // ========================================

    else {

        button.classList.add(
            "wrong"
        );

        // Mostra a alternativa correta
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

        // Perde uma vida
        vidas--;

        /*
            NÃO chamamos avancarPersonagem().

            Portanto o personagem
            permanece na plataforma.
        */

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

    /*
        O número da questão continua aumentando
        mesmo se o jogador errar.

        Porém isso NÃO movimenta o personagem.
    */

    numeroQuestao++;

    carregarQuestao();
}


// ========================================
// AVANÇA O PERSONAGEM
// ========================================

function avancarPersonagem() {

    /*
        Só chegamos aqui quando o
        jogador ACERTA.
    */

    // Ainda não chegou na última plataforma
    if (
        posicaoPersonagem <
        TOTAL_PLATAFORMAS - 1
    ) {

        posicaoPersonagem++;

        atualizarPersonagem(true);

        return;
    }


    /*
        Se acertou estando na plataforma 10,
        completou o cenário.

        Passamos para o próximo cenário.
    */

    indiceCenario++;

    // Faz os cenários repetirem infinitamente
    if (
        indiceCenario >=
        cenarios.length
    ) {

        indiceCenario = 0;
    }


    /*
        Volta para a primeira plataforma.
    */

    posicaoPersonagem = 0;


    // Atualiza o fundo
    atualizarCenario();


    /*
        Aqui atualizamos a posição sem o
        pulo normal entre plataformas,
        pois começou um novo percurso.
    */

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


    // ========================================
    // PLATAFORMAS
    // ========================================

    platforms.forEach(
        (platform, index) => {

            if (!platform) {
                return;
            }

            platform.classList.remove(
                "current",
                "completed"
            );

            // Plataformas já percorridas
            if (
                index <
                posicaoPersonagem
            ) {

                platform.classList.add(
                    "completed"
                );
            }

            // Plataforma atual
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


    // ========================================
    // ANIMAÇÃO DE PULO
    // ========================================

    if (fazerPulo) {

        character.classList.remove(
            "jumping"
        );

        /*
            Força o navegador a reiniciar
            a animação.
        */

        void character.offsetWidth;

        character.classList.add(
            "jumping"
        );
    }


    // ========================================
    // MOVIMENTO
    // ========================================

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
// ATUALIZA INFORMAÇÕES
// ========================================

function atualizarInterface() {

    livesElement.textContent =
        vidas;

    scoreElement.textContent =
        pontos;

    questionNumberElement.textContent =
        numeroQuestao;
}


// ========================================
// FINALIZA O JOGO
// ========================================

function finalizarJogo() {

    jogoFinalizado = true;

    pararTimer();

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

    // Volta para primeira plataforma
    posicaoPersonagem = 0;

    // Volta para primeiro cenário
    indiceCenario = 0;

    tempoRestante =
        TEMPO_POR_QUESTAO;

    jogoFinalizado = false;
    bloqueado = false;

    gameOver.style.display =
        "none";

    atualizarCenario();

    atualizarPersonagem(false);

    carregarQuestao();
}


// ========================================
// BOTÕES DAS RESPOSTAS
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


// ========================================
// JOGAR NOVAMENTE
// ========================================

playAgainBtn.addEventListener(
    "click",
    () => {

        reiniciarJogo();
    }
);


// ========================================
// VOLTAR AO MENU
// ========================================

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
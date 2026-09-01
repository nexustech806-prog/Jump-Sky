// Elementos da tela
const questionElement =
    document.getElementById("question");

const answerButtons =
    document.querySelectorAll(".answer-btn");

const hitsElement =
    document.getElementById("hits");

const errorsElement =
    document.getElementById("errors");

const currentPlatformElement =
    document.getElementById("currentPlatform");

const character =
    document.getElementById("character");

const restartBtn =
    document.getElementById("restartBtn");


// Plataformas
const platforms = [
    document.getElementById("platform0"),
    document.getElementById("platform1"),
    document.getElementById("platform2"),
    document.getElementById("platform3"),
    document.getElementById("platform4")
];


// Estado do jogo
let currentQuestion = 0;
let currentPlatform = 0;
let hits = 0;
let errors = 0;
let gameFinished = false;


// Posição do personagem
const characterPositions = [

    {
        left: "70px",
        bottom: "80px"
    },

    {
        left: "305px",
        bottom: "155px"
    },

    {
        left: "535px",
        bottom: "240px"
    },

    {
        left: "775px",
        bottom: "170px"
    },

    {
        left: "1000px",
        bottom: "290px"
    }

];


// Gera uma conta de subtração aleatória
function generateQuestion() {

    // Primeiro número
    const number1 =
        Math.floor(Math.random() * 10) * 1;

    // Segundo número menor que o primeiro
    const number2 =
        Math.floor(Math.random() * (number1 + 1)) + 1;

    // Resultado
    const correct =
        number1 * number2;


    // Cria respostas erradas
    let wrong1;
    let wrong2;


    // Primeira resposta errada
    do {

        wrong1 =
            correct +
            Math.floor(Math.random() * 7) * 3;

    } while (
        wrong1 === correct ||
        wrong1 < 0
    );


    // Segunda resposta errada
    do {

        wrong2 =
            correct +
            Math.floor(Math.random() * 9) * 4;

    } while (
        wrong2 === correct ||
        wrong2 === wrong1 ||
        wrong2 < 0
    );


    // Lista de respostas
    const answers = [
        correct,
        wrong1,
        wrong2
    ];


    // Embaralha as respostas
    answers.sort(() => Math.random() - 0.5);


    return {
        number1: number1,
        number2: number2,
        correct: correct,
        answers: answers
    };

}


// Cria as perguntas
const questions = [];


// São 4 perguntas para chegar ao final
for (let i = 0; i < 4; i++) {

    questions.push(
        generateQuestion()
    );

}


// Coloca o personagem na posição
function setCharacterPosition() {

    const position =
        characterPositions[currentPlatform];


    character.style.left =
        position.left;


    character.style.bottom =
        position.bottom;

}


// Carrega a pergunta
function loadQuestion() {

    if (
        currentQuestion >=
        questions.length
    ) {

        finishGame();

        return;

    }


    const question =
        questions[currentQuestion];


    // Mostra a conta
    questionElement.textContent =
        `Quanto é ${question.number1} x ${question.number2}?`;


    // Coloca as respostas nos botões
    answerButtons.forEach(
        (button, index) => {

            button.textContent =
                question.answers[index];

            button.classList.remove(
                "correct",
                "wrong"
            );

            button.disabled = false;

        }
    );

}


// Atualiza os números
function updateStats() {

    hitsElement.textContent =
        hits;


    errorsElement.textContent =
        errors;


    currentPlatformElement.textContent =
        Math.min(
            currentPlatform + 1,
            5
        );

}


// Atualiza as plataformas
function updatePlatforms() {

    platforms.forEach(
        (platform, index) => {

            platform.classList.remove(
                "current"
            );


            // Marca as plataformas concluídas
            if (
                index < currentPlatform
            ) {

                platform.classList.add(
                    "completed"
                );

            }

        }
    );


    // Marca a plataforma atual
    if (
        currentPlatform <
        platforms.length
    ) {

        platforms[currentPlatform]
            .classList.add("current");

    }

}


// Verifica a resposta
function checkAnswer(button) {

    if (gameFinished) return;


    const question =
        questions[currentQuestion];


    const selectedAnswer =
        Number(button.textContent);


    // Desativa os botões
    answerButtons.forEach(
        btn => {

            btn.disabled = true;

        }
    );


    // Resposta correta
    if (
        selectedAnswer ===
        question.correct
    ) {

        button.classList.add(
            "correct"
        );


        // Adiciona acerto
        hits++;


        // Avança
        currentPlatform++;


        // Atualiza informações
        updateStats();

        updatePlatforms();


        // Anima o personagem
        character.classList.add(
            "jumping"
        );


        // Move o personagem
        setTimeout(() => {

            setCharacterPosition();

        }, 250);


        // Remove animação
        setTimeout(() => {

            character.classList.remove(
                "jumping"
            );

        }, 700);


        // Próxima pergunta
        setTimeout(() => {

            currentQuestion++;

            loadQuestion();

        }, 1000);

    }


    // Resposta errada
    else {

        button.classList.add(
            "wrong"
        );


        // Adiciona erro
        errors++;


        updateStats();


        // Mostra a resposta correta
        answerButtons.forEach(
            btn => {

                if (
                    Number(btn.textContent) ===
                    question.correct
                ) {

                    btn.classList.add(
                        "correct"
                    );

                }

            }
        );


        // Libera os botões novamente
        setTimeout(() => {

            answerButtons.forEach(
                btn => {

                    btn.classList.remove(
                        "correct",
                        "wrong"
                    );

                    btn.disabled = false;

                }

            );

        }, 1000);

    }

}


// Finaliza o jogo
function finishGame() {

    gameFinished = true;


    questionElement.textContent =
        "🎉 Parabéns! Você chegou ao final!";


    // Esconde os botões
    answerButtons.forEach(
        button => {

            button.style.display =
                "none";

        }
    );


    // Mostra reiniciar
    restartBtn.style.display =
        "inline-block";

}


// Reinicia o jogo
function restartGame() {

    currentQuestion = 0;

    currentPlatform = 0;

    hits = 0;

    errors = 0;

    gameFinished = false;


    // Gera novas contas
    questions.length = 0;


    for (let i = 0; i < 4; i++) {

        questions.push(
            generateQuestion()
        );

    }


    // Reseta plataformas
    platforms.forEach(
        platform => {

            platform.classList.remove(
                "completed",
                "current"
            );

        }
    );


    // Volta para o início
    platforms[0]
        .classList.add("current");


    // Mostra os botões
    answerButtons.forEach(
        button => {

            button.style.display =
                "block";

        }
    );


    // Esconde reiniciar
    restartBtn.style.display =
        "none";


    // Atualiza tudo
    updateStats();

    setCharacterPosition();

    loadQuestion();

}


// Eventos dos botões
answerButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                checkAnswer(button);

            }
        );

    }
);


// Botão de reiniciar
restartBtn.addEventListener(
    "click",
    restartGame
);


// Inicia o jogo
updateStats();

setCharacterPosition();

loadQuestion();
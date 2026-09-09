// ========================================
// ELEMENTOS DA TELA
// ========================================

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

const intro =
    document.getElementById("intro");

const feedback =
    document.getElementById("feedback");


// ========================================
// ELEMENTOS DA DICA
// ========================================

const hintPopup =
    document.getElementById("hintPopup");

const hintText =
    document.getElementById("hintText");

const closeHint =
    document.getElementById("closeHint");


// ========================================
// PLATAFORMAS
// ========================================

const platforms = [
    document.getElementById("platform0"),
    document.getElementById("platform1"),
    document.getElementById("platform2"),
    document.getElementById("platform3"),
    document.getElementById("platform4")
];


// ========================================
// POSIÇÃO DO PERSONAGEM
// ========================================

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


// ========================================
// VARIÁVEIS DO JOGO
// ========================================

let questions = [];

let currentQuestion = 0;

let currentPlatform = 0;

let hits = 0;

let errors = 0;

let gameFinished = false;

let busy = false;


// ========================================
// GERA 3 RESPOSTAS
// ========================================

function generateAnswers(correct) {

    const answers = [correct];


    // Possíveis respostas erradas
    const possibleAnswers = [

        correct + 1,
        correct - 1,

        correct + 2,
        correct - 2,

        correct + 3,
        correct - 3,

        correct + 4,
        correct - 4,

        correct + 5,
        correct - 5,

        correct + 6,
        correct - 6,

        correct + 7,
        correct - 7,

        correct + 8,
        correct - 8,

        correct + 10,
        correct - 10

    ];


    // Remove respostas menores que 1
    // e iguais à correta
    const validAnswers =
        possibleAnswers.filter(
            answer =>
                answer > 0 &&
                answer !== correct
        );


    // Embaralha
    validAnswers.sort(
        () => Math.random() - 0.5
    );


    // Adiciona somente 2 respostas erradas
    for (
        let i = 0;
        i < validAnswers.length &&
        answers.length < 3;
        i++
    ) {

        if (
            !answers.includes(
                validAnswers[i]
            )
        ) {

            answers.push(
                validAnswers[i]
            );

        }

    }


    // Segurança para garantir 3 respostas
    let number = 1;

    while (
        answers.length < 3
    ) {

        if (
            !answers.includes(number)
        ) {

            answers.push(number);

        }

        number++;

    }


    // Embaralha as 3 respostas
    answers.sort(
        () => Math.random() - 0.5
    );


    return answers;
}


// ========================================
// GERA UMA QUESTÃO
// ========================================

function generateQuestion(questionNumber) {

    let divisor;

    let correct;

    let number1;

    let questionText;


    // ========================================
    // QUESTÃO 1
    // Mais fácil
    // ========================================

    if (
        questionNumber === 0
    ) {

        divisor =
            Math.floor(
                Math.random() * 5
            ) + 3;


        correct =
            Math.floor(
                Math.random() * 7
            ) + 4;


        number1 =
            divisor * correct;


        questionText =
            `Quanto é ${number1} ÷ ${divisor}?`;

    }


    // ========================================
    // QUESTÃO 2
    // ========================================

    else if (
        questionNumber === 1
    ) {

        divisor =
            Math.floor(
                Math.random() * 6
            ) + 4;


        correct =
            Math.floor(
                Math.random() * 8
            ) + 5;


        number1 =
            divisor * correct;


        questionText =
            `Quanto é ${number1} ÷ ${divisor}?`;

    }


    // ========================================
    // QUESTÃO 3
    // ========================================

    else if (
        questionNumber === 2
    ) {

        divisor =
            Math.floor(
                Math.random() * 8
            ) + 5;


        correct =
            Math.floor(
                Math.random() * 10
            ) + 6;


        number1 =
            divisor * correct;


        questionText =
            `Quanto é ${number1} ÷ ${divisor}?`;

    }


    // ========================================
    // QUESTÃO 4
    // Mais difícil
    // ========================================

    else {

        divisor =
            Math.floor(
                Math.random() * 10
            ) + 6;


        correct =
            Math.floor(
                Math.random() * 14
            ) + 7;


        number1 =
            divisor * correct;


        const problems = [

            `Carlos tem ${number1} moedas para dividir igualmente entre ${divisor} crianças. Quantas moedas cada criança receberá?`,

            `Beatriz tem ${number1} lápis e quer dividir igualmente entre ${divisor} alunos. Quantos lápis cada aluno receberá?`,

            `Rafael tem ${number1} estrelas e vai colocá-las igualmente em ${divisor} grupos. Quantas estrelas ficarão em cada grupo?`,

            `Sofia tem ${number1} brinquedos para dividir igualmente entre ${divisor} crianças. Quantos brinquedos cada criança receberá?`,

            `Lucas recebeu ${number1} cartas e decidiu dividir igualmente entre ${divisor} amigos. Quantas cartas cada amigo receberá?`

        ];


        questionText =
            problems[
                Math.floor(
                    Math.random() *
                    problems.length
                )
            ];

    }


    // Gera exatamente 3 respostas
    const answers =
        generateAnswers(correct);


    return {

        number1: number1,

        number2: divisor,

        correct: correct,

        answers: answers,

        questionText: questionText

    };

}


// ========================================
// CRIA AS 4 PERGUNTAS
// ========================================

function createQuestions() {

    questions = [];


    for (
        let i = 0;
        i < 4;
        i++
    ) {

        let newQuestion;

        let attempts = 0;


        // Evita contas repetidas
        do {

            newQuestion =
                generateQuestion(i);

            attempts++;

        } while (

            questions.some(
                question =>

                    question.number1 ===
                    newQuestion.number1 &&

                    question.number2 ===
                    newQuestion.number2
            )

            &&

            attempts < 100

        );


        questions.push(
            newQuestion
        );

    }

}


// ========================================
// POSICIONA O PERSONAGEM
// ========================================

function setCharacterPosition() {

    const position =
        characterPositions[
            currentPlatform
        ];


    if (!position) {

        return;

    }


    character.style.left =
        position.left;


    character.style.bottom =
        position.bottom;

}


// ========================================
// CARREGA A PERGUNTA
// ========================================

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


    // Limpa o feedback anterior
    if (feedback) {

        feedback.textContent = "";

        feedback.className = "";

    }


    // Coloca a pergunta na tela
    questionElement.textContent =
        question.questionText;


    // Coloca as 3 respostas
    answerButtons.forEach(
        (button, index) => {

            button.textContent =
                question.answers[index];


            button.classList.remove(
                "correct",
                "wrong"
            );


            button.disabled =
                false;

        }
    );


    setCharacterPosition();

    updateStats();

    updatePlatforms();

}


// ========================================
// ATUALIZA OS NÚMEROS
// ========================================

function updateStats() {

    hitsElement.textContent =
        hits;


    errorsElement.textContent =
        errors;


    currentPlatformElement.textContent =
        currentPlatform + 1;

}


// ========================================
// ATUALIZA AS PLATAFORMAS
// ========================================

function updatePlatforms() {

    platforms.forEach(
        (platform, index) => {

            if (!platform) {

                return;

            }


            // Remove estados antigos
            platform.classList.remove(
                "current",
                "completed"
            );


            // Plataformas anteriores ficam verdes
            if (
                index <
                currentPlatform
            ) {

                platform.classList.add(
                    "completed"
                );

            }


            // Plataforma atual
            else if (
                index ===
                currentPlatform
            ) {

                platform.classList.add(
                    "current"
                );

            }

        }
    );

}


// ========================================
// MOSTRA A DICA
// ========================================

function showHint(question) {

    if (
        !hintPopup ||
        !hintText
    ) {

        return;

    }


    hintText.textContent =

        `Pense em quantos grupos de ${question.number2} ` +
        `cabem em ${question.number1}. ` +
        `Você também pode fazer ` +
        `${question.number2} × ? = ${question.number1}.`;


    hintPopup.classList.add(
        "show"
    );

}


// ========================================
// VERIFICA A RESPOSTA
// ========================================

function checkAnswer(button) {

    if (
        busy ||
        gameFinished
    ) {

        return;

    }


    const question =
        questions[currentQuestion];


    const answer =
        Number(
            button.textContent
        );


    // ========================================
    // RESPOSTA CORRETA
    // ========================================

    if (
        answer ===
        question.correct
    ) {

        busy = true;


        // Deixa o botão verde
        button.classList.add(
            "correct"
        );


        // Feedback imediato
        if (feedback) {

            feedback.textContent =
                "🎉 Muito bem! Resposta correta!";

            feedback.className =
                "feedback-correct";

        }


        hits++;

        if (platforms[currentPlatform ]) {
         platforms[currentPlatform ].textContent = "✓";
        } 
        currentPlatform++;


        updateStats();

        updatePlatforms();


        // Faz o personagem pular
        character.classList.add(
            "jumping"
        );


        setTimeout(
            () => {

                character.classList.remove(
                    "jumping"
                );


                setCharacterPosition();

            },
            700
        );


        // Vai para a próxima pergunta
        setTimeout(
            () => {

                currentQuestion++;

                busy = false;

                loadQuestion();

            },
            1000
        );

    }


    // ========================================
    // RESPOSTA ERRADA
    // ========================================

    else {

        // Deixa somente a resposta
        // escolhida vermelha
        button.classList.add(
            "wrong"
        );


        // Feedback imediato
        if (feedback) {

            feedback.textContent =
                "💡 Quase! Tente novamente!";

            feedback.className =
                "feedback-wrong";

        }


        errors++;


        updateStats();


        // Bloqueia os botões
        answerButtons.forEach(
            btn => {

                btn.disabled =
                    true;

            }
        );


        // Mostra a dica
        setTimeout(
            () => {

                showHint(question);

            },
            300
        );

    }

}


// ========================================
// FECHA O POP-UP DA DICA
// ========================================

if (closeHint) {

    closeHint.addEventListener(
        "click",
        () => {

            // Fecha a dica
            hintPopup.classList.remove(
                "show"
            );


            // Limpa o feedback
            if (feedback) {

                feedback.textContent =
                    "";

                feedback.className =
                    "";

            }


            // Limpa o estado dos botões
            answerButtons.forEach(
                button => {

                    button.classList.remove(
                        "correct",
                        "wrong"
                    );


                    button.disabled =
                        false;

                }
            );

        }
    );

}

// ========================================
// FINALIZA A FASE
// ========================================

function finishGame() {

    gameFinished = true;


    questionElement.textContent =
        "🎉 Parabéns! Você completou a fase!";


    // Feedback final
    if (feedback) {

        feedback.textContent =
            "🏆 Você terminou a fase!";

        feedback.className =
            "feedback-correct";

    }


    // Desativa os botões
    answerButtons.forEach(
        button => {

            button.disabled =
                true;

        }
    );


    // Mostra o botão
    if (restartBtn) {

        restartBtn.style.display =
            "block";

    }


    // Anima o personagem
    character.classList.add(
        "jumping"
    );


    setTimeout(
        () => {

            character.classList.remove(
                "jumping"
            );

        },
        700
    );

}


// ========================================
// REINICIA O JOGO
// ========================================

function restartGame() {

    currentQuestion = 0;

    currentPlatform = 0;

    hits = 0;

    errors = 0;

    gameFinished = false;

    busy = false;


    // Esconde o botão
    if (restartBtn) {

        restartBtn.style.display =
            "none";

    }


    // Fecha a dica
    if (hintPopup) {

        hintPopup.classList.remove(
            "show"
        );

    }


    // Limpa o feedback
    if (feedback) {

        feedback.textContent = "";

        feedback.className = "";

    }


    // Cria novas perguntas
    createQuestions();


    updateStats();

    updatePlatforms();

    setCharacterPosition();

    loadQuestion();

}


// ========================================
// BOTÕES DE RESPOSTA
// ========================================

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


// ========================================
// BOTÃO DE JOGAR NOVAMENTE
// ========================================

if (restartBtn) {

    restartBtn.addEventListener(
        "click",
        restartGame
    );

}


// ========================================
// INTRO
// ========================================

if (intro) {

    setTimeout(
        () => {

            intro.style.opacity =
                "0";


            setTimeout(
                () => {

                    intro.style.display =
                        "none";

                },
                800
            );

        },
        2500
    );

}


// ========================================
// ESCONDE O BOTÃO NO INÍCIO
// ========================================

if (restartBtn) {

    restartBtn.style.display =
        "none";

}


// ========================================
// INICIA O JOGO
// ========================================

createQuestions();

updateStats();

updatePlatforms();

setCharacterPosition();

loadQuestion();
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

const intro =
    document.getElementById("intro");

// Elementos da dica
const hintPopup =
    document.getElementById("hintPopup");

const hintText =
    document.getElementById("hintText");

const closeHint =
    document.getElementById("closeHint");


// Plataformas
const platforms = [
    document.getElementById("platform0"),
    document.getElementById("platform1"),
    document.getElementById("platform2"),
    document.getElementById("platform3"),
    document.getElementById("platform4")
];


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


// Variáveis do jogo
let questions = [];

let currentQuestion = 0;

let currentPlatform = 0;

let hits = 0;

let errors = 0;

let gameFinished = false;

let busy = false;


// Gera 3 respostas
function generateAnswers(correct) {

    // A resposta correta já entra primeiro
    const answers = [correct];

    // Tenta criar respostas próximas da correta
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
        correct - 5
    ];


    // Remove respostas menores que 1
    // e que sejam iguais à correta
    const validAnswers =
        possibleAnswers.filter(
            answer =>
                answer > 0 &&
                answer !== correct
        );


    // Embaralha as respostas erradas
    validAnswers.sort(
        () => Math.random() - 0.5
    );


    // Adiciona somente 2 respostas erradas
    for (
        let i = 0;
        answers.length < 3 &&
        i < validAnswers.length;
        i++
    ) {

        if (!answers.includes(validAnswers[i])) {

            answers.push(
                validAnswers[i]
            );
        }
    }


    // Segurança para garantir 3 respostas
    let number = 1;

    while (answers.length < 3) {

        if (!answers.includes(number)) {

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


// Gera uma questão
function generateQuestion(questionNumber) {

    let divisor;

    let correct;

    let number1;

    let questionText;


    // Questões 1 e 2
    if (questionNumber <= 1) {

        divisor =
            Math.floor(
                Math.random() * 4
            ) + 2;

        correct =
            Math.floor(
                Math.random() * 5
            ) + 2;

        number1 =
            divisor * correct;

        questionText =
            `Quanto é ${number1} ÷ ${divisor}?`;
    }


    // Questão 3
    else if (questionNumber === 2) {

        divisor =
            Math.floor(
                Math.random() * 6
            ) + 3;

        correct =
            Math.floor(
                Math.random() * 8
            ) + 3;

        number1 =
            divisor * correct;

        questionText =
            `Quanto é ${number1} ÷ ${divisor}?`;
    }


    // Questão 4
    else {

        divisor =
            Math.floor(
                Math.random() * 7
            ) + 2;

        correct =
            Math.floor(
                Math.random() * 8
            ) + 3;

        number1 =
            divisor * correct;


        const problems = [

            `Carlos tem ${number1} moedas para dividir igualmente entre ${divisor} crianças. Quantas moedas cada criança receberá?`,

            `Beatriz tem ${number1} lápis e quer dividir igualmente entre ${divisor} alunos. Quantos lápis cada aluno receberá?`,

            `Rafael tem ${number1} estrelas e vai colocá-las igualmente em ${divisor} grupos. Quantas estrelas ficarão em cada grupo?`,

            `Sofia tem ${number1} brinquedos para dividir igualmente entre ${divisor} crianças. Quantos brinquedos cada criança receberá?`

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


// Cria as perguntas
function createQuestions() {

    questions = [];

    for (
        let i = 0;
        i < 4;
        i++
    ) {

        questions.push(
            generateQuestion(i)
        );
    }
}


// Posiciona o personagem
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


    questionElement.textContent =
        question.questionText;


    // Coloca as 3 respostas nos 3 botões
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


    setCharacterPosition();

    updateStats();

    updatePlatforms();
}


// Atualiza os números
function updateStats() {

    hitsElement.textContent =
        hits;

    errorsElement.textContent =
        errors;

    currentPlatformElement.textContent =
        currentPlatform + 1;
}


// Atualiza as plataformas
function updatePlatforms() {

    platforms.forEach((platform, index) => {

        if (!platform) {
            return;
        }

        // Remove os estados antigos
        platform.classList.remove(
            "current",
            "completed"
        );

        // Plataformas anteriores ficam verdes
        if (index < currentPlatform) {

            platform.classList.add(
                "completed"
            );
        }

        // Plataforma onde o personagem está
        else if (index === currentPlatform) {

            platform.classList.add(
                "current"
            );
        }

    });
}

// Mostra a dica
function showHint(question) {

    hintText.textContent =
        `Pense em quantos grupos de ${question.number2} ` +
        `cabem em ${question.number1}. ` +
        `Você também pode fazer ` +
        `${question.number2} × ? = ${question.number1}.`;


    hintPopup.classList.add("show");
}


// Verifica a resposta
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
        Number(button.textContent);


    // Resposta correta
    if (
        answer === question.correct
    ) {

        busy = true;


        button.classList.add(
            "correct"
        );


        hits++;

        currentPlatform++;


        updateStats();

        updatePlatforms();


        // Anima o personagem
        character.classList.add(
            "jumping"
        );


        setTimeout(() => {

            character.classList.remove(
                "jumping"
            );

            setCharacterPosition();

        }, 700);


        setTimeout(() => {

            currentQuestion++;

            busy = false;

            loadQuestion();

        }, 1000);
    }


    // Resposta errada
    else {

        button.classList.add(
            "wrong"
        );


        // Registra o erro
        // sem perder pontos ou progresso
        errors++;

        updateStats();


        // Destaca a resposta correta
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


        // Bloqueia os botões
        answerButtons.forEach(
            btn => {

                btn.disabled = true;

            }
        );


        // Mostra a dica
        setTimeout(() => {

            showHint(question);

        }, 300);
    }
}


// Fecha o pop-up
if (closeHint) {

    closeHint.addEventListener(
        "click",
        () => {

            hintPopup.classList.remove(
                "show"
            );


            answerButtons.forEach(
                button => {

                    button.classList.remove(
                        "correct",
                        "wrong"
                    );

                    button.disabled = false;
                }
            );
        }
    );
}


// Finaliza a fase
function finishGame() {

    gameFinished = true;


    questionElement.textContent =
        "🎉 Parabéns! Você completou a fase!";


    answerButtons.forEach(
        button => {

            button.disabled = true;

        }
    );


    // Mostra o botão de jogar novamente
    if (restartBtn) {

        restartBtn.style.display =
            "block";
    }


    // Anima o personagem
    character.classList.add(
        "jumping"
    );


    setTimeout(() => {

        character.classList.remove(
            "jumping"
        );

    }, 700);
}


// Reinicia o jogo
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


    // Cria perguntas novas
    createQuestions();


    updateStats();

    updatePlatforms();

    setCharacterPosition();

    loadQuestion();
}


// Botões de resposta
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


// Botão de jogar novamente
if (restartBtn) {

    restartBtn.addEventListener(
        "click",
        restartGame
    );
}


// Intro
if (intro) {

    setTimeout(() => {

        intro.classList.add(
            "hide"
        );

    }, 3000);
}


// Esconde o botão no início
if (restartBtn) {

    restartBtn.style.display =
        "none";
}


// Inicia o jogo
createQuestions();

updateStats();

updatePlatforms();

setCharacterPosition();

loadQuestion();

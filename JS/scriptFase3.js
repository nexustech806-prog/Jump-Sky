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


const faseAtual = 3;

async function completarFase(fase) {
    const idUser = localStorage.getItem('idUser');

    try {
        const resp = await fetch(`${API_URL}/api/save/${idUser}/avancar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ faseCompletada: fase })
        });

        const data = await resp.json();
        console.log('Progresso atualizado:', data.saveProgress);
    } catch (error) {
        console.error('Erro ao atualizar progresso:', error);
    }
}

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


    // Respostas próximas da correta
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
        correct - 7
    ];


    // Remove números inválidos
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


    // Adiciona 2 respostas erradas
    for (
        let i = 0;
        i < validAnswers.length &&
        answers.length < 3;
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


// ========================================
// GERA UMA QUESTÃO DE MULTIPLICAÇÃO
// ========================================

function generateQuestion(questionNumber) {

    let number1;

    let number2;

    let correct;

    let questionText;


    // ====================================
    // QUESTÃO 1
    // Fácil
    // 2 até 5 × 2 até 5
    // ====================================

    if (questionNumber === 0) {

        number1 =
            Math.floor(
                Math.random() * 4
            ) + 2;

        number2 =
            Math.floor(
                Math.random() * 4
            ) + 2;

        correct =
            number1 * number2;

        questionText =
            `Quanto é ${number1} × ${number2}?`;
    }


    // ====================================
    // QUESTÃO 2
    // Fácil
    // 2 até 9 × 2 até 9
    // ====================================

    else if (questionNumber === 1) {

        number1 =
            Math.floor(
                Math.random() * 8
            ) + 2;

        number2 =
            Math.floor(
                Math.random() * 8
            ) + 2;

        correct =
            number1 * number2;

        questionText =
            `Quanto é ${number1} × ${number2}?`;
    }


    // ====================================
    // QUESTÃO 3
    // Médio
    // 3 até 12 × 3 até 11
    // ====================================

    else if (questionNumber === 2) {

        number1 =
            Math.floor(
                Math.random() * 10
            ) + 3;

        number2 =
            Math.floor(
                Math.random() * 9
            ) + 3;

        correct =
            number1 * number2;

        questionText =
            `Quanto é ${number1} × ${number2}?`;
    }


    // ====================================
    // QUESTÃO 4
    // Difícil
    // 4 até 15 × 4 até 12
    // ====================================

    else {

        number1 =
            Math.floor(
                Math.random() * 12
            ) + 4;

        number2 =
            Math.floor(
                Math.random() * 9
            ) + 4;

        correct =
            number1 * number2;


        // Situações do cotidiano
        const problems = [

            `João organizou ${number1} caixas com ${number2} brinquedos em cada uma. Quantos brinquedos há ao todo?`,

            `Ana montou ${number1} grupos com ${number2} crianças em cada grupo. Quantas crianças há ao todo?`,

            `Pedro comprou ${number1} pacotes com ${number2} figurinhas em cada pacote. Quantas figurinhas ele comprou ao todo?`,

            `Lucas colocou ${number2} lápis em cada uma das ${number1} caixas. Quantos lápis há ao todo?`

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

        number2: number2,

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


        // Gera uma questão
        // diferente da anterior
        do {

            newQuestion =
                generateQuestion(i);

            attempts++;

        } while (

            i > 0 &&
            newQuestion.questionText ===
            questions[i - 1].questionText &&
            attempts < 50

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
        characterPositions[currentPlatform];


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


    // Limpa o feedback da pergunta anterior
    if (feedback) {

        feedback.textContent =
            "";

        feedback.className =
            "";

    }


    // Mostra a pergunta
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

            button.disabled = false;
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


            platform.classList.remove(
                "current",
                "completed"
            );


            // Plataformas anteriores ficam verdes
            if (
                index < currentPlatform
            ) {

                platform.classList.add(
                    "completed"
                );
            }


            // Plataforma atual recebe destaque
            else if (
                index === currentPlatform
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

    if (!hintPopup || !hintText) {
        return;
    }


    hintText.textContent =
        `Pense em ${question.number1} grupos ` +
        `de ${question.number2}. ` +
        `Você também pode somar ` +
        `${question.number2} ${question.number1} vezes.`;


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


        button.classList.add(
            "correct"
        );


        // Mostra feedback imediatamente
        feedback.textContent =
            "🎉 Muito bem! Resposta correta!";

        feedback.className =
            "feedback-correct";


        hits++;

        if (platforms[currentPlatform ]) {
         platforms[currentPlatform ].textContent = "✓";
        } 
        currentPlatform++;

        updateStats();

        updatePlatforms();


        // Anima o personagem
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


        // Próxima questão
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

        button.classList.add(
            "wrong"
        );


        // Mostra feedback imediatamente
        feedback.textContent =
            "💡 Quase! Tente novamente!";

        feedback.className =
            "feedback-wrong";


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
// FECHA O POP-UP
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


    // Desativa os botões
    answerButtons.forEach(
        button => {

            button.disabled = true;

        }
    );


    // Mostra o botão
    if (restartBtn) {

        restartBtn.style.display =
            "block";
    }


    // Plataforma final
    currentPlatform = 4;

    updateStats();

    updatePlatforms();

    setCharacterPosition();


    // Pulo final
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

    completarFase(faseAtual);
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
// BOTÃO DE FINAL DA FASE
// ========================================

if (restartBtn) {
    restartBtn.addEventListener("click", () => {
        window.location.href = mapaFases[faseAtual + 1]; 
    });
}


// ========================================
// INTRO
// ========================================

// Some com a intro
setTimeout(() => {
    intro.style.opacity = "0";

    setTimeout(() => {
        intro.style.display = "none";
    }, 800);
}, 2500);



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
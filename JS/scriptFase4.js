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

async function aplicarAvatar() {
    try {
        const resp = await fetch(`${API_URL}/api/save`, { credentials: 'include' });
        const data = await resp.json();

        if (data.avatar && character) {
            const img = character.querySelector('img');
            if (img) {
                img.src = `/images/${data.avatar}`;
            }
        }
    } catch (error) {
        console.error('Erro ao aplicar avatar:', error);
    }
}

aplicarAvatar();

const bonusChallenge =
    document.getElementById("bonusChallenge");

const bonusQuestion =
    document.getElementById("bonusQuestion");

const bonusAnswerButtons =
    document.querySelectorAll(".bonus-answer");

const bonusFeedback =
    document.getElementById("bonusFeedback");

const enterBonus =
    document.getElementById("enterBonus");

const tryBonusAgain =
    document.getElementById("tryBonusAgain");

const backMenuBonus =
    document.getElementById("backMenuBonus");

let bonusCorrectAnswer = 0;


// ========================================
// ELEMENTOS DA DICA
// ========================================

const hintPopup =
    document.getElementById("hintPopup");

const hintText =
    document.getElementById("hintText");

const closeHint =
    document.getElementById("closeHint");


const faseAtual = 4;

async function completarFase(fase) {
    try {
        const resp = await fetch(`${API_URL}/api/save/avancar`, {
            method: 'PUT',
            credentials: 'include',
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

    const validAnswers =
        possibleAnswers.filter(
            answer =>
                answer > 0 &&
                answer !== correct
        );

    validAnswers.sort(
        () => Math.random() - 0.5
    );

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

    if (feedback) {

        feedback.textContent = "";

        feedback.className = "";

    }

    questionElement.textContent =
        question.questionText;

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

            platform.classList.remove(
                "current",
                "completed"
            );

            if (
                index <
                currentPlatform
            ) {

                platform.classList.add(
                    "completed"
                );

            }

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

    if (
        answer ===
        question.correct
    ) {

        busy = true;

        button.classList.add(
            "correct"
        );

        if (feedback) {

            feedback.textContent =
                "🎉 Muito bem! Resposta correta!";

            feedback.className =
                "feedback-correct";

        }

        hits++;

        if (platforms[currentPlatform]) {
            platforms[currentPlatform].textContent = "✓";
        }

        currentPlatform++;

        updateStats();

        updatePlatforms();

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

        setTimeout(
            () => {

                currentQuestion++;

                busy = false;

                loadQuestion();

            },
            1000
        );

    }

    else {

        button.classList.add(
            "wrong"
        );

        if (feedback) {

            feedback.textContent =
                "💡 Quase! Tente novamente!";

            feedback.className =
                "feedback-wrong";

        }

        errors++;

        updateStats();

        answerButtons.forEach(
            btn => {

                btn.disabled =
                    true;

            }
        );

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

            hintPopup.classList.remove(
                "show"
            );

            if (feedback) {

                feedback.textContent =
                    "";

                feedback.className =
                    "";

            }

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
// GERA O DESAFIO BÔNUS
// ========================================

function generateBonusChallenge() {

    const operations = ["+", "-", "×", "÷"];

    const operation =
        operations[
            Math.floor(
                Math.random() * operations.length
            )
        ];

    let number1;
    let number2;
    let correct;

    if (operation === "+") {

        number1 =
            Math.floor(Math.random() * 40) + 10;

        number2 =
            Math.floor(Math.random() * 40) + 10;

        correct = number1 + number2;

    }

    else if (operation === "-") {

        number1 =
            Math.floor(Math.random() * 40) + 20;

        number2 =
            Math.floor(Math.random() * number1);

        correct = number1 - number2;

    }

    else if (operation === "×") {

        number1 =
            Math.floor(Math.random() * 10) + 2;

        number2 =
            Math.floor(Math.random() * 10) + 2;

        correct = number1 * number2;

    }

    else {

        number2 =
            Math.floor(Math.random() * 8) + 2;

        correct =
            Math.floor(Math.random() * 10) + 2;

        number1 =
            number2 * correct;

    }

    bonusCorrectAnswer = correct;

    bonusQuestion.textContent =
        `Quanto é ${number1} ${operation} ${number2}?`;

    const answers = [correct];

    while (answers.length < 3) {

        const difference =
            Math.floor(Math.random() * 11) - 5;

        const wrong =
            correct + difference;

        if (
            wrong >= 0 &&
            wrong !== correct &&
            !answers.includes(wrong)
        ) {

            answers.push(wrong);

        }

    }

    answers.sort(
        () => Math.random() - 0.5
    );

    bonusAnswerButtons.forEach(
        (button, index) => {

            button.textContent =
                answers[index];

            button.disabled = false;

            button.classList.remove(
                "correct",
                "wrong"
            );

        }
    );

    bonusFeedback.textContent = "";
    bonusFeedback.style.color = "";

    enterBonus.style.display = "none";

    tryBonusAgain.style.display = "none";

    backMenuBonus.style.display = "inline-block";

}


// ========================================
// ABRE O DESAFIO
// ========================================

function showBonusChallenge() {

    if (!bonusChallenge) {
        return;
    }

    generateBonusChallenge();

    bonusChallenge.classList.add("show");

}


// ========================================
// VERIFICA RESPOSTA DO DESAFIO
// ========================================

function checkBonusAnswer(button) {

    const answer =
        Number(button.textContent);

    bonusAnswerButtons.forEach(
        btn => {

            btn.disabled = true;

        }
    );

    if (answer === bonusCorrectAnswer) {

        button.classList.add("correct");

        bonusFeedback.textContent =
            "🎉 Acertou! A missão secreta foi desbloqueada!";

        bonusFeedback.style.color =
            "#4CAF50";

        enterBonus.style.display =
            "inline-block";

    }

    else {

        button.classList.add("wrong");

        bonusAnswerButtons.forEach(
            btn => {

                if (
                    Number(btn.textContent) ===
                    bonusCorrectAnswer
                ) {

                    btn.classList.add("correct");

                }

            }
        );

        bonusFeedback.textContent =
            `💡 Quase! A resposta correta era ${bonusCorrectAnswer}.`;

        bonusFeedback.style.color =
            "#F44336";

        tryBonusAgain.style.display =
            "inline-block";

    }

}


// ========================================
// FINALIZA A FASE
// ========================================

function finishGame() {

    if (gameFinished) {
        return;
    }

    gameFinished = true;

    questionElement.textContent =
        "🎉 Parabéns! Você completou a fase!";

    if (feedback) {

        feedback.textContent =
            "🏆 Você terminou a fase!";

        feedback.className =
            "feedback-correct";

    }

    answerButtons.forEach(
        button => {

            button.disabled =
                true;

        }
    );

    if (restartBtn) {

        restartBtn.style.display =
            "block";

    }

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

    setTimeout(
        () => {

            showBonusChallenge();

        },
        1200
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

    if (restartBtn) {

        restartBtn.style.display =
            "none";

    }

    if (hintPopup) {

        hintPopup.classList.remove(
            "show"
        );

    }

    if (feedback) {

        feedback.textContent = "";

        feedback.className = "";

    }

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
// BOTÃO DE VOLTAR AO MENU
// ========================================

if (restartBtn) {
    restartBtn.addEventListener("click", () => {
        const proximaFase = faseAtual + 1;

        if (slugsPorFase[proximaFase]) {
            window.location.href = `/${slugsPorFase[proximaFase]}`;
        } else {

            window.location.href = '/menu';
        }
    });
}
    const menuBtn = document.getElementById("menuBtn");

        if (menuBtn) {
            menuBtn.addEventListener("click", () => {
            window.location.href = "/menu";
            });
        }



// ========================================
// EVENTOS DO DESAFIO BÔNUS
// ========================================

bonusAnswerButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                checkBonusAnswer(button);

            }
        );

    }
);

if (tryBonusAgain) {

    tryBonusAgain.addEventListener(
        "click",
        () => {

            generateBonusChallenge();

        }
    );

}

if (enterBonus) {

    enterBonus.addEventListener(
        "click",
        () => {

            window.location.href =
                "/pulando-no-espaco";

        }
    );

}

if (backMenuBonus) {

    backMenuBonus.addEventListener(
        "click",
        () => {

            window.location.href =
                "/menu";

        }
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

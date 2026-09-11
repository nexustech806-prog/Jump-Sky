// Elementos da tela
const questionElement = document.getElementById("question");
const answerButtons = document.querySelectorAll(".answer-btn");
const hitsElement = document.getElementById("hits");
const errorsElement = document.getElementById("errors");
const currentPlatformElement = document.getElementById("currentPlatform");
const character = document.getElementById("character");
const restartBtn = document.getElementById("restartBtn");
const intro = document.getElementById("intro");




// Plataformas
const platforms = [
    document.getElementById("platform0"),
    document.getElementById("platform1"),
    document.getElementById("platform2"),
    document.getElementById("platform3"),
    document.getElementById("platform4")
];

// Contas da partida
let questions = [];

// Estado do jogo
let currentQuestion = 0;
let currentPlatform = 0;
let hits = 0;
let errors = 0;
let gameFinished = false;
let busy = false;

// Posições do personagem
const characterPositions = [
    { left: "65px", bottom: "75px" },
    { left: "225px", bottom: "120px" },
    { left: "385px", bottom: "165px" },
    { left: "555px", bottom: "127px" },
    { left: "715px", bottom: "197px" }
];

// Sorteia um número
function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Embaralha as alternativas
function shuffle(list) {
    const copy = [...list];

    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy;
}

// Cria 4 contas aleatórias
function createQuestions() {
    questions = [];

    for (let i = 0; i < 4; i++) {
        const number1 = randomNumber(1, 20);
        const number2 = randomNumber(1, 20);
        const correct = number1 + number2;
        const answers = [correct];

        while (answers.length < 3) {
            const wrong = correct + randomNumber(-6, 6);

            if (wrong !== correct && wrong > 0 && !answers.includes(wrong)) {
                answers.push(wrong);
            }
        }

        questions.push({
            number1,
            number2,
            answers: shuffle(answers),
            correct
        });
    }
}

// Move o personagem
function setCharacterPosition() {
    const position = characterPositions[currentPlatform];
    character.style.left = position.left;
    character.style.bottom = position.bottom;
}

// Carrega a pergunta
function loadQuestion() {
    if (currentQuestion >= questions.length) {
        finishGame();
        return;
    }

    const question = questions[currentQuestion];

    questionElement.textContent =
        `Quanto é ${question.number1} + ${question.number2}?`;

    answerButtons.forEach((button, index) => {
        button.style.display = "";
        button.textContent = question.answers[index];
        button.classList.remove("correct", "wrong");
        button.disabled = false;
    });

    busy = false;
}

// Atualiza placar
function updateStats() {
    hitsElement.textContent = hits;
    errorsElement.textContent = errors;
    currentPlatformElement.textContent = Math.min(currentPlatform + 1, 5);
}

// Atualiza plataformas
function updatePlatforms() {
    platforms.forEach((platform, index) => {
        platform.classList.remove("current");

        if (index < currentPlatform) {
            platform.classList.add("completed");
        }
    });

    if (currentPlatform < platforms.length) {
        platforms[currentPlatform].classList.add("current");
    }
}

// Confere a resposta
function checkAnswer(button) {
    if (gameFinished || busy) return;

    const question = questions[currentQuestion];
    const selectedAnswer = Number(button.textContent);

    busy = true;

    answerButtons.forEach((btn) => {
        btn.disabled = true;
    });

    if (selectedAnswer === question.correct) {
        button.classList.add("correct");
        hits++;
        currentPlatform++;

        updateStats();
        updatePlatforms();

        character.classList.add("jumping");

        setTimeout(() => {
            setCharacterPosition();
        }, 250);

        setTimeout(() => {
            character.classList.remove("jumping");
        }, 700);

        setTimeout(() => {
            currentQuestion++;
            loadQuestion();
        }, 1000);
    } else {
        button.classList.add("wrong");
        errors++;
        updateStats();

        answerButtons.forEach((btn) => {
            if (Number(btn.textContent) === question.correct) {
                btn.classList.add("correct");
            }
        });

        setTimeout(() => {
            answerButtons.forEach((btn) => {
                btn.classList.remove("correct", "wrong");
                btn.disabled = false;
            });
            busy = false;
        }, 1000);
    }
}

// Fim da fase
function finishGame() {
    gameFinished = true;
    questionElement.textContent = "🎉 Parabéns! Você chegou ao final!";

    answerButtons.forEach((button) => {
        button.style.display = "none";
    });

    restartBtn.style.display = "inline-block";
}

// Reinicia a fase
function restartGame() {
    currentQuestion = 0;
    currentPlatform = 0;
    hits = 0;
    errors = 0;
    gameFinished = false;
    busy = false;

    createQuestions();

    platforms.forEach((platform) => {
        platform.classList.remove("completed", "current");
    });

    platforms[0].classList.add("current");
    platforms[1].textContent = "?";
    platforms[2].textContent = "?";
    platforms[3].textContent = "?";

    restartBtn.style.display = "none";

    updateStats();
    setCharacterPosition();
    loadQuestion();
}

// Clique nas respostas
answerButtons.forEach((button) => {
    button.addEventListener("click", () => {
        checkAnswer(button);
    });
});

// Clique em jogar de novo
restartBtn.addEventListener("click", restartGame);

// Começa o jogo
createQuestions();
updateStats();
setCharacterPosition();
loadQuestion();

// Some com a intro
setTimeout(() => {
    intro.style.opacity = "0";

    setTimeout(() => {
        intro.style.display = "none";
    }, 800);
}, 2500);
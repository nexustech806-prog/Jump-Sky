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
let bonusChallengeToken = null;
let bonusRetryAction = null;
let bonusRequestPending = false;
let bonusUnlocked = false;


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

function completarFase() {
    return phaseSession.complete();
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
const phaseSession = window.JumpSkyGameSession.createPhase(faseAtual, "÷");
let phaseRetryAction = null;
let phaseSaved = false;
let phaseSaving = false;


// ========================================
// CARREGA AS PERGUNTAS DA FASE
// ========================================

async function createQuestions() {
    busy = true;
    phaseSaved = false;
    phaseRetryAction = null;
    answerButtons.forEach(button => { button.disabled = true; });
    restartBtn.style.display = "none";
    feedback.textContent = "";
    questionElement.textContent = "Preparando suas perguntas...";
    try {
        const progress = await window.JumpSkyGameSession.request("/api/save");
        if (!Number.isInteger(progress.saveProgress)) {
            throw new Error("Não foi possível carregar seu progresso. Tente novamente.");
        }
        if (progress.saveProgress === 4 && progress.phase4Completed) {
            phaseSaved = true;
            gameFinished = true;
            currentPlatform = 4;
            hits = 4;
            updateStats();
            updatePlatforms();
            setCharacterPosition();
            stopBackgroundMusic();
            questionElement.textContent = "Você já completou esta fase! Vamos ao desafio bônus.";
            feedback.textContent = "Seu progresso continua salvo.";
            feedback.className = "feedback-correct";
            await showBonusChallenge();
            return;
        }
        questions = await phaseSession.start();
        busy = false;
        loadQuestion();
    } catch (error) {
        questionElement.textContent = "Não foi possível carregar as perguntas.";
        feedback.textContent = error.message;
        feedback.className = "feedback-wrong";
        phaseRetryAction = createQuestions;
        restartBtn.textContent = "Tentar carregar novamente";
        restartBtn.style.display = "block";
        restartBtn.disabled = false;
        restartBtn.focus();
    }
}

function setCharacterPosition() {
    const platform = platforms[currentPlatform];
    const scene = document.querySelector(".scene");

    if (!platform || !scene || !character) {
        return;
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

    phaseSession.recordAnswer(answer);
    playSound("correct");

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

    playSound("wrong");

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

async function generateBonusChallenge() {
    if (bonusRequestPending) return;
    bonusRequestPending = true;
    bonusUnlocked = false;
    bonusRetryAction = null;
    bonusChallengeToken = null;
    bonusQuestion.textContent = "Preparando seu desafio...";
    bonusFeedback.textContent = "";
    bonusFeedback.style.color = "";
    enterBonus.style.display = "none";
    tryBonusAgain.style.display = "none";
    backMenuBonus.style.display = "inline-block";
    bonusAnswerButtons.forEach(button => {
        button.disabled = true;
        button.textContent = "?";
        button.classList.remove("correct", "wrong");
    });
    try {
        const data = await window.JumpSkyGameSession.request("/api/game/bonus", {
            method: "POST", body: "{}"
        });
        if (!data.challengeToken || !data.question || !Number.isInteger(data.question.correct) ||
            !Number.isInteger(data.question.number1) || !Number.isInteger(data.question.number2) ||
            !Array.isArray(data.question.answers) || data.question.answers.length !== 3 ||
            !data.question.answers.every(Number.isInteger) || !data.question.answers.includes(data.question.correct)) {
            throw new Error("Não foi possível preparar o desafio.");
        }
        bonusChallengeToken = data.challengeToken;
        const question = data.question;
        bonusCorrectAnswer = question.correct;
        bonusQuestion.textContent = createEverydayProblem(
            question.operation || "÷", question.number1, question.number2
        );
        bonusAnswerButtons.forEach((button, index) => {
            button.textContent = question.answers[index];
            button.disabled = false;
        });
        bonusAnswerButtons[0]?.focus();
    } catch (error) {
        bonusFeedback.textContent = error.message;
        bonusFeedback.style.color = "#b42318";
        bonusRetryAction = generateBonusChallenge;
        tryBonusAgain.textContent = "Tentar carregar novamente";
        tryBonusAgain.style.display = "inline-block";
        tryBonusAgain.focus();
    } finally {
        bonusRequestPending = false;
    }
}


// ========================================
// ABRE O DESAFIO
// ========================================

async function showBonusChallenge() {
    if (!bonusChallenge) return;
    bonusChallenge.classList.add("show");
    await generateBonusChallenge();
}


// ========================================
// VERIFICA RESPOSTA DO DESAFIO
// ========================================

async function checkBonusAnswer(button) {
    if (bonusRequestPending || bonusUnlocked || !bonusChallengeToken || button.disabled) return;
    const answer = Number(button.textContent);
    bonusAnswerButtons.forEach(btn => { btn.disabled = true; });
    if (answer === bonusCorrectAnswer) {
        playSound("correct");
        button.classList.add("correct");
        await saveBonusUnlock(answer);
    } else {
        playSound("wrong");
        button.classList.add("wrong");
        bonusAnswerButtons.forEach(btn => {
            if (Number(btn.textContent) === bonusCorrectAnswer) btn.classList.add("correct");
        });
        bonusFeedback.textContent = "Quase! A resposta correta era " + bonusCorrectAnswer + ".";
        bonusFeedback.style.color = "#b42318";
        bonusRetryAction = generateBonusChallenge;
        tryBonusAgain.textContent = "Tentar novamente";
        tryBonusAgain.style.display = "inline-block";
        tryBonusAgain.focus();
    }
}

async function saveBonusUnlock(answer) {
    if (bonusRequestPending) return;
    bonusRequestPending = true;
    bonusRetryAction = null;
    enterBonus.style.display = "none";
    tryBonusAgain.style.display = "none";
    bonusFeedback.textContent = "Acertou! Salvando a missão secreta...";
    bonusFeedback.style.color = "";
    try {
        const saved = await window.JumpSkyGameSession.request("/api/save/bonus-unlock", {
            method: "PUT",
            body: JSON.stringify({ challengeToken: bonusChallengeToken, answer })
        });
        if (saved.saveProgress !== 5 || !saved.phase4Completed) {
            throw new Error("O desbloqueio ainda não foi confirmado. Tente novamente.");
        }
        bonusUnlocked = true;
        bonusFeedback.textContent = "Acertou! A missão secreta foi desbloqueada!";
        bonusFeedback.style.color = "#1b6a32";
        enterBonus.style.display = "inline-block";
        enterBonus.focus();
    } catch (error) {
        bonusFeedback.textContent = error.message + " Sua resposta continua salva nesta tela.";
        bonusFeedback.style.color = "#b42318";
        bonusRetryAction = () => saveBonusUnlock(answer);
        tryBonusAgain.textContent = "Tentar salvar novamente";
        tryBonusAgain.style.display = "inline-block";
        tryBonusAgain.focus();
    } finally {
        bonusRequestPending = false;
    }
}


// ========================================
// FINALIZA A FASE
// ========================================

async function finishGame() {
    if (phaseSaving) return;
    gameFinished = true;
    busy = true;
    phaseSaving = true;
    phaseRetryAction = null;
    answerButtons.forEach(button => { button.disabled = true; });
    restartBtn.style.display = "none";
    questionElement.textContent = "Você acertou todas! Salvando seu progresso...";
    feedback.textContent = "Aguarde um instante.";
    feedback.className = "";
    try {
        await completarFase();
        phaseSaved = true;
    } catch (error) {
        questionElement.textContent = "Suas respostas estão aqui. Vamos tentar salvar outra vez?";
        feedback.textContent = error.message;
        feedback.className = "feedback-wrong";
        phaseRetryAction = finishGame;
        restartBtn.textContent = "Tentar salvar novamente";
        restartBtn.style.display = "block";
        restartBtn.disabled = false;
        restartBtn.focus();
        return;
    } finally {
        phaseSaving = false;
    }
    stopBackgroundMusic();
    playSound("complete");
    questionElement.textContent = "Parabéns! Você completou a fase!";
    feedback.textContent = "Progresso salvo!";
    feedback.className = "feedback-correct";
    character.classList.add("jumping");
    setTimeout(() => character.classList.remove("jumping"), 700);
    restartBtn.style.display = "none";
    await showBonusChallenge();
}


// ========================================
// REINICIA O JOGO
// ========================================

function restartGame() {
    startBackgroundMusic();
    currentQuestion = 0;
    currentPlatform = 0;
    hits = 0;
    errors = 0;
    gameFinished = false;
    busy = true;
    hintPopup?.classList.remove("show");
    void createQuestions();
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
    restartBtn.type = "button";
    restartBtn.addEventListener("click", () => {
        if (phaseSaving) return;
        if (phaseRetryAction) {
            void phaseRetryAction();
            return;
        }
        if (phaseSaved) window.location.href = "/menu";
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

            if (!bonusRequestPending) void (bonusRetryAction || generateBonusChallenge)();

        }
    );

}

if (enterBonus) {

    enterBonus.addEventListener(
        "click",
        () => {

            if (bonusUnlocked) window.location.href = "/pulando-no-espaco";

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

void createQuestions();

updateStats();

updatePlatforms();

setCharacterPosition();

// Reposiciona o personagem ao redimensionar a janela ou alterar o zoom.
window.addEventListener("resize", setCharacterPosition);

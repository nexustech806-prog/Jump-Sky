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
const phaseSession = window.JumpSkyGameSession.createPhase(faseAtual, "×");
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

    phaseSession.recordAnswer(answer);
    playSound("correct");

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

    playSound("wrong");

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
    currentPlatform = 4;
    updateStats();
    updatePlatforms();
    setCharacterPosition();
    restartBtn.textContent = "Ir para a próxima fase";
    restartBtn.style.display = "block";
    restartBtn.disabled = false;
    restartBtn.focus();
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
// BOTÃO DE FINAL DA FASE
// ========================================


if (restartBtn) {
    restartBtn.type = "button";
    restartBtn.addEventListener("click", () => {
        if (phaseSaving) return;
        if (phaseRetryAction) {
            void phaseRetryAction();
            return;
        }
        if (!phaseSaved) return;
        const proximaFase = faseAtual + 1;
        window.location.href = slugsPorFase[proximaFase]
            ? "/" + slugsPorFase[proximaFase] : "/menu";
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

void createQuestions();

updateStats();

updatePlatforms();

setCharacterPosition();

// Reposiciona o personagem ao redimensionar a janela ou alterar o zoom.
window.addEventListener("resize", setCharacterPosition);


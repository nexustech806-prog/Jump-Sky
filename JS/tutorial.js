// ========================================
// ELEMENTOS
// ========================================

const steps = document.querySelectorAll(".tutorial-step");
const dots = document.querySelectorAll(".progress-dot");

const previousBtn = document.getElementById("previousBtn");
const nextBtn = document.getElementById("nextBtn");
const startBtn = document.getElementById("startBtn");
const stepCounter = document.getElementById("stepCounter");

const audioBtn = document.getElementById("audioBtn");
const audioStatus = document.getElementById("audioStatus");


// ========================================
// ESTADO
// ========================================

let currentStep = 0;


// ========================================
// NARRAÇÃO
// ========================================

const NARRACOES = [
    "/audio/tutorialetapa-1.mp3",
    "/audio/tutorialetapa-2.mp3",
    "/audio/tutorialetapa-3.mp3",
    "/audio/tutorialetapa-4.mp3",
    "/audio/tutorialetapa-5.mp3",
    "/audio/tutorialetapa-6.mp3",
    "/audio/tutorialetapa-7.mp3"
];

const narracao = new Audio();
narracao.preload = "none";

function mostrarStatusAudio(mensagem) {
    if (audioStatus) {
        audioStatus.textContent = mensagem;
    }
}

function atualizarBotaoAudio(tocando) {
    if (!audioBtn) return;

    audioBtn.textContent = tocando
        ? "⏹ Parar áudio"
        : "🔊 Ouvir esta etapa";
}

function pararNarracao() {
    narracao.pause();
    narracao.currentTime = 0;
    atualizarBotaoAudio(false);
}

function tocarNarracao() {
    mostrarStatusAudio("");

    narracao.src = NARRACOES[currentStep];

    // Usa o mesmo volume salvo pelo audio.js, se ele estiver carregado
    narracao.volume =
        typeof getSoundVolume === "function"
            ? getSoundVolume()
            : 0.8;

    narracao.play()
        .then(() => {
            atualizarBotaoAudio(true);
        })
        .catch(() => {
            atualizarBotaoAudio(false);
            mostrarStatusAudio(
                "O áudio desta etapa ainda não está disponível."
            );
        });
}

function alternarNarracao() {
    if (narracao.paused) {
        tocarNarracao();
    } else {
        pararNarracao();
    }
}

// Quando o áudio termina sozinho, o botão volta ao estado inicial
narracao.addEventListener("ended", () => {
    atualizarBotaoAudio(false);
});

if (audioBtn) {
    audioBtn.addEventListener("click", alternarNarracao);
}


// ========================================
// ATUALIZA O TUTORIAL
// ========================================

function updateTutorial() {

    // Ao mudar de etapa, o áudio da etapa anterior é interrompido
    pararNarracao();
    mostrarStatusAudio("");

    steps.forEach((step, index) => {
        step.classList.toggle("active", index === currentStep);
    });

    dots.forEach((dot, index) => {
        dot.classList.toggle("active", index === currentStep);
    });

    stepCounter.textContent = `${currentStep + 1} de ${steps.length}`;

    previousBtn.disabled = currentStep === 0;

    const lastStep = currentStep === steps.length - 1;

    if (lastStep) {
        nextBtn.style.display = "none";
        startBtn.style.display = "inline-block";
    } else {
        nextBtn.style.display = "inline-block";
        startBtn.style.display = "none";
    }
}


// ========================================
// PRÓXIMO
// ========================================

function nextStep() {
    if (currentStep < steps.length - 1) {
        currentStep++;
        updateTutorial();
    }
}


// ========================================
// ANTERIOR
// ========================================

function previousStep() {
    if (currentStep > 0) {
        currentStep--;
        updateTutorial();
    }
}


// ========================================
// EVENTOS
// ========================================

nextBtn.addEventListener("click", nextStep);
previousBtn.addEventListener("click", previousStep);

// Permite navegar com o teclado
document.addEventListener("keydown", event => {
    if (event.key === "ArrowRight") {
        nextStep();
    }

    if (event.key === "ArrowLeft") {
        previousStep();
    }
});


// ========================================
// INICIALIZA
// ========================================

updateTutorial();
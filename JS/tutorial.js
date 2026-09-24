// ========================================
// ELEMENTOS
// ========================================

const steps =
    document.querySelectorAll(
        ".tutorial-step"
    );

const dots =
    document.querySelectorAll(
        ".progress-dot"
    );

const previousBtn =
    document.getElementById(
        "previousBtn"
    );

const nextBtn =
    document.getElementById(
        "nextBtn"
    );

const startBtn =
    document.getElementById(
        "startBtn"
    );

const stepCounter =
    document.getElementById(
        "stepCounter"
    );


// ========================================
// ESTADO
// ========================================

let currentStep = 0;


// ========================================
// ATUALIZA O TUTORIAL
// ========================================

function updateTutorial() {

    steps.forEach(
        (step, index) => {

            step.classList.toggle(
                "active",
                index === currentStep
            );

        }
    );


    dots.forEach(
        (dot, index) => {

            dot.classList.toggle(
                "active",
                index === currentStep
            );

        }
    );


    stepCounter.textContent =
        `${currentStep + 1} de ${steps.length}`;


    // Primeiro passo
    previousBtn.disabled =
        currentStep === 0;


    // Último passo
    const lastStep =
        currentStep ===
        steps.length - 1;


    if (lastStep) {

        nextBtn.style.display =
            "none";

        startBtn.style.display =
            "inline-block";

    }

    else {

        nextBtn.style.display =
            "inline-block";

        startBtn.style.display =
            "none";

    }

}


// ========================================
// PRÓXIMO
// ========================================

function nextStep() {

    if (
        currentStep <
        steps.length - 1
    ) {

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

nextBtn.addEventListener(
    "click",
    nextStep
);

previousBtn.addEventListener(
    "click",
    previousStep
);


// Permite navegar com o teclado
document.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "ArrowRight"
        ) {

            nextStep();

        }

        if (
            event.key ===
            "ArrowLeft"
        ) {

            previousStep();

        }

    }
);


// ========================================
// INICIALIZA
// ========================================

updateTutorial();
// ========================================
// FONTE
// ========================================

const MIN_FONTE = 80;
const MAX_FONTE = 150;
const PASSO_FONTE = 10;

function aplicarTamanhoFonte(percentual) {
    document.documentElement.style.fontSize = `${percentual}%`;

    const label = document.getElementById('fontePercentual');
    if (label) label.textContent = `${percentual}%`;

    localStorage.setItem('tamanhoFonte', percentual);
}

function carregarTamanhoFonte() {
    const salvo = Number(localStorage.getItem('tamanhoFonte')) || 100;
    aplicarTamanhoFonte(salvo);
}

const btnAumentar = document.getElementById('aumentarFonte');
const btnDiminuir = document.getElementById('diminuirFonte');

if (btnAumentar) {
    btnAumentar.addEventListener('click', () => {
        const atual = Number(localStorage.getItem('tamanhoFonte')) || 100;
        aplicarTamanhoFonte(Math.min(atual + PASSO_FONTE, MAX_FONTE));
    });
}

if (btnDiminuir) {
    btnDiminuir.addEventListener('click', () => {
        const atual = Number(localStorage.getItem('tamanhoFonte')) || 100;
        aplicarTamanhoFonte(Math.max(atual - PASSO_FONTE, MIN_FONTE));
    });
}


// ========================================
// ALTO CONTRASTE
// ========================================

const checkAltoContraste = document.getElementById('altoContraste');

function aplicarAltoContraste(ativado) {
    document.body.classList.toggle('alto-contraste', ativado);
    localStorage.setItem('altoContraste', ativado);
}

if (checkAltoContraste) {
    checkAltoContraste.addEventListener('change', (e) => {
        aplicarAltoContraste(e.target.checked);
    });
}


// ========================================
// SONS DE ACERTO/ERRO (usa audio.js)
// ========================================

const checkFeedbackSonoro = document.getElementById('feedbackSonoro');

if (checkFeedbackSonoro) {
    checkFeedbackSonoro.checked = isSoundEnabled();

    checkFeedbackSonoro.addEventListener('change', (e) => {
        setSoundEnabled(e.target.checked);
    });
}


// ========================================
// FEEDBACK VISUAL REFORÇADO
// ========================================

const checkFeedbackVisual = document.getElementById('feedbackVisualReforcado');

function aplicarFeedbackReforcado(ativado) {
    document.body.classList.toggle('feedback-reforcado', ativado);
    localStorage.setItem('feedbackVisualReforcado', ativado);
}

if (checkFeedbackVisual) {
    checkFeedbackVisual.addEventListener('change', (e) => {
        aplicarFeedbackReforcado(e.target.checked);
    });
}


// ========================================
// CARREGA TODAS AS PREFERÊNCIAS AO ABRIR A PÁGINA
// ========================================

function carregarPreferenciasAcessibilidade() {

    carregarTamanhoFonte();

    const altoContrasteSalvo = localStorage.getItem('altoContraste') === 'true';
    if (checkAltoContraste) checkAltoContraste.checked = altoContrasteSalvo;
    aplicarAltoContraste(altoContrasteSalvo);

    const visualSalvo = localStorage.getItem('feedbackVisualReforcado') === 'true';
    if (checkFeedbackVisual) checkFeedbackVisual.checked = visualSalvo;
    aplicarFeedbackReforcado(visualSalvo);

    // o checkbox de som é sincronizado pelo próprio audio.js
    // (updateAccessibilityCheckbox, chamado no DOMContentLoaded dele)
}

carregarPreferenciasAcessibilidade();
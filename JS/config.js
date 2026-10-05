const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : window.location.origin;

const slugsPorFase = {
    1: 'somando-nas-nuvens',
    2: 'subtraindo-no-subsolo',
    3: 'multiplicando-no-oceano',
    4: 'dividindo-no-vulcao',
    5: 'pulando-no-espaco',
};

(function () {
    const tamanhoSalvo = localStorage.getItem('tamanhoFonte');
    if (tamanhoSalvo) {
        document.documentElement.style.fontSize = `${tamanhoSalvo}%`;
    }

    const altoContrasteSalvo = localStorage.getItem('altoContraste') === 'true';
    if (altoContrasteSalvo) {
        document.body.classList.add('alto-contraste');
    }

    const visualSalvo = localStorage.getItem('feedbackVisualReforcado') === 'true';
    if (visualSalvo) {
        document.body.classList.add('feedback-reforcado');
    }
})();

function aplicarFeedbackReforcado(ativado) {
    document.body.classList.toggle('feedback-reforcado', ativado);
    localStorage.setItem('feedbackVisualReforcado', ativado);
}
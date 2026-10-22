const API_URL = window.location.origin;

const slugsPorFase = {
    1: 'somando-nas-nuvens',
    2: 'subtraindo-no-subsolo',
    3: 'multiplicando-no-oceano',
    4: 'dividindo-no-vulcao',
    5: 'pulando-no-espaco',
};

(function () {
    const tamanhoSalvo = Number(localStorage.getItem('tamanhoFonte') ?? 100);
    const tamanho = Number.isFinite(tamanhoSalvo) ? Math.max(80, Math.min(150, tamanhoSalvo)) : 100;
    document.documentElement.style.fontSize = `${tamanho}%`;

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

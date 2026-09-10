const API_URL = 'https://jump-sky-gamma.vercel.app';
const mapaFases = {
    1: 'FirstScene.html',
    2: 'SecondScene.html',
    3: 'ThirdScene.html',
    4: 'FourthScene.html',
    5: 'FifthScene.html'
};

async function checarAcesso(idUser, fase) {
    const resp = await fetch(`${API_URL}/api/save/${idUser}/fase/${fase}`);
    const data = await resp.json();
    return data; 
}

async function abrirFase(fase) {
    const idUser = localStorage.getItem('idUser');
    const { liberado, saveProgress } = await checarAcesso(idUser, fase);
    if (!liberado) {
        alert('Você ainda não desbloqueou essa fase!');
        window.location.href = mapaFases[saveProgress];
        return;
    }
    window.location.href = mapaFases[fase];
}

async function verificarAcessoFase(faseAtual) {
    const idUser = localStorage.getItem('idUser');
    if (!idUser) {
        window.location.href = 'login.html';
        return;
    }
    const { liberado, saveProgress } = await checarAcesso(idUser, faseAtual);
    if (!liberado) {
        alert('Você ainda não desbloqueou essa fase!');
        window.location.href = mapaFases[saveProgress];
    }
}
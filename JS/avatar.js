// Usa os nomes reais dos arquivos, inclusive em servidores Linux.
function normalizeAvatar(value) {
    const avatars = {
        'personagem.png': 'Personagem.png',
        'personagem2.png': 'personagem2.png',
        'personagem3.png': 'personagem3.png',
        'personagem4.png': 'personagem4.png'
    };
    return typeof value === 'string' ? avatars[value.toLowerCase()] || 'Personagem.png' : 'Personagem.png';
}

async function loadPlayerAvatar() {
    const image = document.querySelector('#character img');
    if (!image) return;
    image.src = '/images/Personagem.png';
    image.addEventListener('error', () => {
        // Uma única tentativa de fallback, mesmo se a imagem padrão faltar.
        if (image.getAttribute('src') !== '/images/Personagem.png') image.src = '/images/Personagem.png';
    });
    try {
        const response = await fetch(`${API_URL}/api/save`, { credentials: 'include' });
        if (!response.ok) return;
        const data = await response.json();
        image.src = '/images/' + normalizeAvatar(data.avatar);
    } catch (error) {
        console.warn('Não foi possível carregar o avatar da conta.', error);
    }
}

// Disponível desde o início da fase, sem depender de acertar perguntas.
document.querySelectorAll('#menuBtn, #backMenuBonus').forEach(button => {
    button.addEventListener('click', () => { window.location.href = '/menu'; });
});
loadPlayerAvatar();

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
    const character = image.parentElement;
    const poses = { 'Personagem.png': 'per1pulo.png', 'personagem2.png': 'per2pulo.png', 'personagem3.png': 'per3pulo.png', 'personagem4.png': 'per4pulo.png' };
    let avatar = 'Personagem.png';
    let cached = false;
    try { const saved = sessionStorage.getItem('jumpSkyAvatar'); cached = !!saved; avatar = normalizeAvatar(saved); } catch (_) {}
    let jumpReady = false;
    const render = () => {
        const name = character.classList.contains('jumping') && jumpReady ? poses[avatar] : avatar;
        const src = '/images/' + name;
        if (image.getAttribute('src') !== src) image.src = src;
    };
    image.style.visibility = 'hidden';
    const prepare = async () => {
        jumpReady = false;
        const idleReady = await window.JumpSkyAssets.load('/images/' + avatar);
        if (!idleReady) avatar = 'Personagem.png';
        render();
        image.style.visibility = '';
        jumpReady = await window.JumpSkyAssets.load('/images/' + poses[avatar]);
        render();
    };
    new MutationObserver(render).observe(character, { attributes: true, attributeFilter: ['class'] });
    if (cached) await prepare();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
        const response = await fetch(API_URL + '/api/save', { credentials: 'include', signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json();
        const selected = normalizeAvatar(data.avatar);
        try { sessionStorage.setItem('jumpSkyAvatar', selected); } catch (_) {}
        if (selected !== avatar || !cached) { avatar = selected; await prepare(); }
    } catch (error) {
        console.warn('Não foi possível carregar o avatar da conta.', error);
    } finally {
        clearTimeout(timeout);
        if (image.style.visibility === 'hidden') await prepare();
    }
}

// Disponível desde o início da fase, sem depender de acertar perguntas.
document.querySelectorAll('#menuBtn, #backMenuBonus').forEach(button => {
    button.addEventListener('click', () => { window.location.href = '/menu'; });
});
window.jumpSkyAvatarReady = loadPlayerAvatar();

const statusPerfil = document.getElementById('statusPerfil');
const opcoesPerfil = document.getElementById('opcoesPerfil');
const listaApelidos = document.getElementById('apelidosPerfil');
const gerarApelidos = document.getElementById('gerarApelidos');
const recarregarPerfil = document.getElementById('recarregarPerfil');
const avataresPerfil = document.querySelectorAll('[data-avatar]');
const proximoApelido = JumpSkyNomes.criarGerador();
let perfilSalvo;
let avatarEscolhido;
let apelidoEscolhido;

async function consultarPerfil(url, options = {}) {
    const result = await JumpSkyRequest(`${API_URL}${url}`, { credentials: 'include', ...options });
    if (result.response.status === 401) window.location.assign('/login');
    return result;
}

function selecionarAvatar(avatar) {
    avatarEscolhido = avatar;
    avataresPerfil.forEach(button => {
        const selected = button.dataset.avatar === avatar;
        button.setAttribute('aria-pressed', String(selected));
        button.classList.toggle('selecionado', selected);
    });
}

function selecionarApelido(nickname) {
    apelidoEscolhido = nickname;
    listaApelidos.querySelectorAll('button').forEach(button => {
        button.setAttribute('aria-pressed', String(button.textContent === nickname));
    });
}

function mostrarApelidos(nomes) {
    listaApelidos.replaceChildren();
    [...new Set([perfilSalvo.nickname, apelidoEscolhido, ...nomes])].forEach(nome => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = nome;
        button.setAttribute('aria-pressed', String(nome === apelidoEscolhido));
        button.addEventListener('click', () => selecionarApelido(nome));
        listaApelidos.appendChild(button);
    });
}

function mostrarPerfil(data) {
    perfilSalvo = data;
    apelidoEscolhido = data.nickname;
    document.getElementById('avatarAtual').src = `/images/${data.avatar}`;
    document.getElementById('apelidoAtual').textContent = data.nickname;
    document.getElementById('perfilAtual').hidden = false;
    selecionarAvatar(data.avatar);
    mostrarApelidos([]);
}

async function carregarPerfil() {
    recarregarPerfil.hidden = true;
    opcoesPerfil.disabled = true;
    statusPerfil.textContent = 'Carregando seu perfil...';
    try {
        const { response, data } = await consultarPerfil('/api/profile');
        if (!response.ok) throw new Error();
        mostrarPerfil(data);
        const recorde = data.bonusHighScore || 0;
        document.getElementById('pontosRecordeBonus').textContent = recorde.toLocaleString('pt-BR');
        document.getElementById('mensagemRecordeBonus').textContent = recorde > 0
            ? 'Essa é sua melhor pontuação. Continue a aventura para superar seu recorde!'
            : 'Você ainda não tem pontos na fase bônus. Jogue para conquistar seu primeiro recorde!';
        document.getElementById('recordeBonus').hidden = false;
        opcoesPerfil.disabled = false;
        statusPerfil.textContent = 'Escolha suas opções e toque em Salvar meu perfil.';
    } catch (error) {
        statusPerfil.textContent = 'Não foi possível carregar seu perfil. Tente novamente.';
        recarregarPerfil.hidden = false;
    }
}

avataresPerfil.forEach(button => button.addEventListener('click', () => selecionarAvatar(button.dataset.avatar)));
recarregarPerfil.addEventListener('click', carregarPerfil);
gerarApelidos.addEventListener('click', async () => {
    opcoesPerfil.disabled = true;
    statusPerfil.textContent = 'Buscando apelidos disponíveis...';
    try {
        let available = [];
        for (let attempt = 0; attempt < 5 && available.length < 3; attempt++) {
            const candidates = Array.from({ length: 12 }, () => proximoApelido()).filter(Boolean);
            if (!candidates.length) break;
            const { response, data } = await consultarPerfil('/api/nicknames/available', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ candidates })
            });
            if (!response.ok) throw new Error();
            available.push(...data.available);
        }
        mostrarApelidos(available.slice(0, 3));
        statusPerfil.textContent = available.length ? 'Escolha um apelido ou mantenha sua seleção.' : 'Nenhum novo apelido encontrado. Tente novamente.';
    } catch (error) {
        statusPerfil.textContent = 'Não foi possível buscar sugestões. Tente novamente.';
    } finally {
        opcoesPerfil.disabled = false;
    }
});

document.getElementById('formPerfil').addEventListener('submit', async event => {
    event.preventDefault();
    if (!perfilSalvo || opcoesPerfil.disabled) return;
    opcoesPerfil.disabled = true;
    statusPerfil.textContent = 'Salvando seu perfil...';
    try {
        const { response, data } = await consultarPerfil('/api/profile', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ avatar: avatarEscolhido, nickname: apelidoEscolhido })
        });
        if (!response.ok) {
            statusPerfil.textContent = response.status === 409 ? 'Esse apelido já foi escolhido. Toque em Ver outras sugestões e escolha outro.' : 'Não foi possível salvar seu perfil. Tente novamente.';
            return;
        }
        mostrarPerfil(data);
        statusPerfil.textContent = `Perfil salvo! Seu apelido para entrar no jogo é ${data.nickname}.`;
    } catch (error) {
        statusPerfil.textContent = 'Não foi possível confirmar o salvamento. Tente novamente ou recarregue a página para conferir seu perfil.';
    } finally {
        opcoesPerfil.disabled = false;
    }
});
carregarPerfil();

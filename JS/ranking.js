(function () {
    const painel = document.getElementById('rankingPainel');
    if (!painel) return;

    const lista = document.getElementById('rankingJogadores');
    const status = document.getElementById('rankingStatus');
    const total = document.getElementById('rankingTotal');
    const tentarNovamente = document.getElementById('rankingTentarNovamente');
    const avatares = new Set(['Personagem.png', 'personagem2.png', 'personagem3.png', 'personagem4.png']);

    function criarJogador(jogador) {
        const item = document.createElement('li');
        item.className = 'ranking-player';
        const posicao = document.createElement('span');
        posicao.className = jogador.position === 1 ? 'ranking-place ranking-place--first' : 'ranking-place';
        posicao.textContent = `${jogador.position}º`;
        const perfil = document.createElement('span');
        perfil.className = 'ranking-player-identity';
        const avatar = document.createElement('img');
        avatar.src = `/images/${avatares.has(jogador.avatar) ? jogador.avatar : 'Personagem.png'}`;
        avatar.alt = '';
        avatar.width = 36;
        avatar.height = 44;
        avatar.loading = 'lazy';
        const apelido = document.createElement('span');
        apelido.textContent = jogador.nickname;
        perfil.append(avatar, apelido);
        const pontos = document.createElement('span');
        pontos.className = 'ranking-player-score';
        const valor = document.createElement('strong');
        valor.textContent = jogador.score.toLocaleString('pt-BR');
        const unidade = document.createElement('span');
        unidade.textContent = 'pontos';
        pontos.append(valor, unidade);
        item.append(posicao, perfil, pontos);
        return item;
    }

    async function carregarRanking() {
        painel.setAttribute('aria-busy', 'true');
        tentarNovamente.hidden = true;
        status.hidden = false;
        status.textContent = 'Buscando os aventureiros...';
        lista.hidden = true;
        total.hidden = true;
        try {
            const { response, data } = await JumpSkyRequest('/api/ranking');
            if (!response.ok || !Array.isArray(data.players) || !Number.isInteger(data.totalPlayers) || data.totalPlayers < 0) throw new Error();
            const jogadores = data.players.slice(0, 10);
            if (jogadores.some(jogador => !Number.isInteger(jogador.position) || jogador.position < 1 || !Number.isInteger(jogador.score) || jogador.score <= 0 || typeof jogador.nickname !== 'string')) throw new Error();
            lista.replaceChildren(...jogadores.map(criarJogador));
            lista.hidden = jogadores.length === 0;
            status.textContent = jogadores.length
                ? ''
                : 'A aventura está começando! Conquiste pontos na fase bônus para aparecer aqui.';
            status.hidden = jogadores.length > 0;
            if (jogadores.length) {
                total.textContent = data.totalPlayers === 1
                    ? '1 aventureiro já conquistou pontos na fase bônus.'
                    : `${data.totalPlayers.toLocaleString('pt-BR')} aventureiros já conquistaram pontos na fase bônus.`;
                total.hidden = false;
            }
        } catch (error) {
            status.textContent = 'Não foi possível carregar o ranking. Vamos tentar de novo?';
            tentarNovamente.hidden = false;
        } finally {
            painel.setAttribute('aria-busy', 'false');
        }
    }

    tentarNovamente.addEventListener('click', carregarRanking);
    carregarRanking();
})();

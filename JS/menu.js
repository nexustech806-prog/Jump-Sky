async function carregarProgresso() {
    try {
        const resp = await fetch(`${API_URL}/api/save`, { credentials: 'include' });

        if (!resp.ok) {
            aplicarEstadoFases(0);
            return;
        }

        const data = await resp.json();
        aplicarEstadoFases(data.saveProgress);
    } catch (error) {
        console.error('Erro ao carregar progresso:', error);
        aplicarEstadoFases(0);
    }
}

function aplicarEstadoFases(saveProgress) {
    const cards = document.querySelectorAll('.card-floor');

    cards.forEach(card => {
        const faseNum = Number(card.dataset.fase);

        // limpa estados anteriores (útil se essa função rodar mais de uma vez)
        card.classList.remove('bloqueado', 'concluido', 'atual');

        // remove ícones que possam ter sido adicionados antes
        const iconeAntigo = card.querySelector('.icone-status');
        if (iconeAntigo) iconeAntigo.remove();

        if (faseNum < saveProgress) {
            // fase já concluída
            card.classList.add('concluido');
            adicionarIcone(card, '✅');
        } else if (faseNum === saveProgress) {
            // fase atual, a próxima a jogar
            card.classList.add('atual');
        } else {
            // fase ainda bloqueada
            card.classList.add('bloqueado');
            card.setAttribute('aria-disabled', 'true');
            adicionarIcone(card, '🔒');

            card.addEventListener('click', (e) => {
                e.preventDefault();
                alert('Você ainda não desbloqueou essa fase!');
            });
        }
    });
}

function adicionarIcone(card, emoji) {
    const icone = document.createElement('span');
    icone.textContent = ` ${emoji}`;
    icone.classList.add('icone-status');

    const titulo = card.querySelector('h3');
    if (titulo) {
        titulo.appendChild(icone);
    }
}

carregarProgresso();
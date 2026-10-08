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

        card.classList.remove('bloqueado', 'concluido', 'atual');

        const iconeAntigo = card.querySelector('.icone-status');
        if (iconeAntigo) iconeAntigo.remove();

        if (faseNum < saveProgress) {
            card.classList.add('concluido');
            adicionarIcone(card, '✅');
        } else if (faseNum === saveProgress) {
            card.classList.add('atual');
        } else {
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
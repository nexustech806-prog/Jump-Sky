async function carregarProgresso() {
  try {
    const resp = await fetch(`${API_URL}/api/save`, { credentials: 'include' });

    if (!resp.ok) {
      aplicarEstadoFases(1);
      return;
    }

    const data = await resp.json();
    aplicarEstadoFases(data.saveProgress);
  } catch (error) {
    console.error('Erro ao carregar progresso:', error);
    aplicarEstadoFases(1);
  }
}

function aplicarEstadoFases(saveProgress) {
  // A fase 1 sempre fica disponível (visitante ou erro no BE)
  const progresso = Math.max(1, Number(saveProgress) || 1);

  document.querySelectorAll('.card-floor').forEach(card => {
    const faseNum = Number(card.dataset.fase);

    card.classList.remove('bloqueado', 'concluido', 'atual');
    card.removeAttribute('aria-disabled');
    card.removeAttribute('tabindex');
    card.querySelector('.icone-status')?.remove();

    if (faseNum < progresso) {
      card.classList.add('concluido');
      adicionarIcone(card, '✅');
    } else if (faseNum === progresso) {
      card.classList.add('atual');
    } else {
      card.classList.add('bloqueado');
      card.setAttribute('aria-disabled', 'true');
      card.setAttribute('tabindex', '-1');
      adicionarIcone(card, '🔒');
    }
  });
}

function adicionarIcone(card, emoji) {
  const icone = document.createElement('span');
  icone.textContent = ` ${emoji}`;
  icone.classList.add('icone-status');
  icone.setAttribute('aria-hidden', 'true');
  card.querySelector('h3')?.appendChild(icone);
}

// Um único listener (delegação): evita empilhar handlers a cada chamada
document.querySelector('.game-floor')?.addEventListener('click', (e) => {
  const card = e.target.closest('.card-floor');
  if (card?.getAttribute('aria-disabled') === 'true') {
    e.preventDefault();
    alert('Você ainda não desbloqueou essa fase!');
  }
});

// ===== Painel de configurações =====
const configDialog = document.getElementById('configDialog');
const abrirConfig  = document.getElementById('abrirConfig');
const fecharConfig = document.getElementById('fecharConfig');

abrirConfig?.addEventListener('click', () => {
  if (typeof configDialog.showModal === 'function') {
    configDialog.showModal();
  } else {
    configDialog.setAttribute('open', ''); // fallback para navegadores antigos
  }
});

fecharConfig?.addEventListener('click', () => configDialog.close());

// Fecha ao clicar fora do painel (no fundo escurecido)
configDialog?.addEventListener('click', (e) => {
  if (e.target === configDialog) configDialog.close();
});

carregarProgresso();
async function carregarProgresso() {
  try {
    const { response: resp, data } = await JumpSkyRequest(`${API_URL}/api/save`, { credentials: 'include' });

    if (!resp.ok) {
      aplicarEstadoFases(1);
      return;
    }

    aplicarEstadoFases(data.saveProgress);
  } catch (error) {
    console.error('Erro ao carregar progresso:', error);
    aplicarEstadoFases(1);
  }
}

function aplicarEstadoFases(saveProgress) {
  // A fase 1 sempre fica disponível (visitante ou erro no BE)
  const progresso = Math.min(5, Math.max(1, Number(saveProgress) || 1));

  document.querySelectorAll('.card-floor').forEach(card => {
    const faseNum = Number(card.dataset.fase);

    card.classList.remove('bloqueado', 'concluido', 'atual');
    card.removeAttribute('aria-disabled');
    card.removeAttribute('tabindex');
    card.removeAttribute('title');
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
      card.setAttribute('title', `Conclua a Fase ${progresso} para liberar esta fase.`);
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
    const status = document.getElementById('faseStatus');
    if (status) status.textContent = card.getAttribute('title');
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
// Only leave the menu after the server has cleared the session cookie.
document.getElementById('sairBtn')?.addEventListener('click', async (event) => {
  const button = event.currentTarget;
  const status = document.getElementById('contaStatus');
  button.disabled = true;
  status.textContent = 'Saindo da conta...';
  try {
    const { response } = await JumpSkyRequest(`${API_URL}/logout`, { method: 'POST', credentials: 'include' });
    if (!response.ok) throw new Error('Logout failed');
    window.location.assign('/login');
  } catch (error) {
    status.textContent = 'Não foi possível sair. Tente novamente.';
    button.disabled = false;
  }
});

const novoJogoDialog = document.getElementById('novoJogoDialog');
const confirmarNovoJogo = document.getElementById('confirmarNovoJogo');
const cancelarNovoJogo = document.getElementById('cancelarNovoJogo');
let reiniciando = false;
document.getElementById('novoJogoBtn')?.addEventListener('click', () => {
  document.getElementById('novoJogoStatus').textContent = '';
  novoJogoDialog.showModal();
  cancelarNovoJogo.focus();
});
cancelarNovoJogo?.addEventListener('click', () => novoJogoDialog.close());
novoJogoDialog?.addEventListener('cancel', event => {
  if (reiniciando) event.preventDefault();
});
confirmarNovoJogo?.addEventListener('click', async () => {
  if (reiniciando) return;
  reiniciando = true;
  confirmarNovoJogo.disabled = cancelarNovoJogo.disabled = true;
  const status = document.getElementById('novoJogoStatus');
  status.textContent = 'Preparando sua nova aventura...';
  try {
    const { response, data } = await JumpSkyRequest(`${API_URL}/api/game/reset`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true })
    });
    if (response.status === 401) {
      window.location.assign('/login');
      return;
    }
    if (!response.ok) throw new Error('Reset failed');
    try { localStorage.removeItem('bonusHighScore:' + data.userId); } catch { /* Storage may be disabled. */ }
    aplicarEstadoFases(1);
    novoJogoDialog.close();
    document.getElementById('faseStatus').textContent = 'Sua nova aventura está pronta! Escolha a Fase 1 para começar.';
  } catch (error) {
    status.textContent = 'Não foi possível confirmar o reinício. Tente novamente ou recarregue o menu para conferir seu progresso.';
  } finally {
    reiniciando = false;
    confirmarNovoJogo.disabled = cancelarNovoJogo.disabled = false;
  }
});

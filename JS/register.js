const proximoApelido = JumpSkyNomes.criarGerador();
let gerandoNomes = false;
let cadastrando = false;

function atualizarBotaoContinuar() {
  document.getElementById('bttn_reg').disabled = gerandoNomes || cadastrando || !document.getElementById('login_reg').value;
}

async function gerarNome() {
  if (gerandoNomes || cadastrando) return;
  const container = document.getElementById('nomesSugeridos');
  const status = document.getElementById('apelidoEscolhido');
  const gerar = document.getElementById('Dice_Name');
  gerandoNomes = true;
  gerar.disabled = true;
  container.setAttribute('aria-busy', 'true');
  container.replaceChildren();
  document.getElementById('login_reg').value = '';
  status.textContent = 'Buscando apelidos livres...';
  atualizarBotaoContinuar();
  try {
    const nomes = [];
    for (let tentativa = 0; tentativa < 5 && nomes.length < 3; tentativa++) {
      const candidates = [];
      for (let i = 0; i < 12; i++) {
        const nome = proximoApelido();
        if (nome === null) break;
        candidates.push(nome);
      }
      if (!candidates.length) break;
      const resposta = await fetch(`${API_URL}/api/nicknames/available`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidates })
      });
      if (!resposta.ok) throw new Error('Falha ao consultar apelidos');
      const dados = await resposta.json();
      if (!Array.isArray(dados.available)) throw new Error('Resposta inesperada');
      nomes.push(...candidates.filter(nome => dados.available.includes(nome)).slice(0, 3 - nomes.length));
    }
    if (!nomes.length) throw new Error('Sem novas sugestoes');
    nomes.forEach(nome => {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.textContent = nome;
      botao.classList.add('nome-sugestao-btn');
      botao.setAttribute('aria-pressed', 'false');
      botao.addEventListener('click', () => {
        if (cadastrando) return;
        document.getElementById('login_reg').value = nome;
        container.querySelectorAll('.nome-sugestao-btn').forEach(item => {
          item.classList.remove('selecionado');
          item.setAttribute('aria-pressed', 'false');
        });
        botao.classList.add('selecionado');
        botao.setAttribute('aria-pressed', 'true');
        status.textContent = `Seu apelido: ${nome}. Guarde esse nome para entrar!`;
        atualizarBotaoContinuar();
      });
      container.appendChild(botao);
    });
    status.textContent = 'Qual destes apelidos combina com voc\u00ea?';
  } catch (error) {
    status.textContent = 'N\u00e3o conseguimos buscar novos apelidos. Tente novamente no bot\u00e3o abaixo.';
  } finally {
    gerandoNomes = false;
    gerar.disabled = false;
    container.setAttribute('aria-busy', 'false');
    atualizarBotaoContinuar();
  }
}

document.getElementById('Dice_Name').addEventListener('click', gerarNome);
document.addEventListener('DOMContentLoaded', gerarNome);

async function createUser(event) {
  event.preventDefault();
  if (cadastrando || gerandoNomes) return;

  const nicknameValue = document.getElementById("login_reg").value.trim();
  const passwordValue = document.getElementById("password_reg").value;
  const confirmValue = document.getElementById("confirm_password_reg").value;

  if (!nicknameValue) {
    alert("Escolha um dos apelidos sugeridos antes de continuar!");
    return;
  }

  if (!passwordValue || !confirmValue) {
    alert("Por favor, preencha todos os campos!");
    return;
  }

  if (passwordValue !== confirmValue) {
    alert("As senhas não coincidem!");
    return;
  }

  const avatarEscolhido = 'Personagem.png';

  cadastrando = true;
  atualizarBotaoContinuar();
  document.getElementById('Dice_Name').disabled = true;
  try {
    const answer = await fetch(`${API_URL}/register`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nickname: nicknameValue,
        password: passwordValue,
        avatar: avatarEscolhido
      })
    });

    const result = await answer.json();

    if (answer.ok) {
      localStorage.removeItem('avatarSelecionado');
      alert('Usuário cadastrado com sucesso!');
      window.location.href = "/selecionar-avatar";
    } else if (answer.status === 409) {
      alert('Esse apelido acabou de ser escolhido. Escolha outro para continuar.');
      cadastrando = false;
      await gerarNome();
    } else {
      alert('Erro: ' + (result.erro || result.mensagem));
    }
  } catch (error) {
    console.error('Erro de conexão com o servidor:', error);
    alert('Não foi possível conectar ao servidor.');
  } finally {
    cadastrando = false;
    document.getElementById('Dice_Name').disabled = false;
    atualizarBotaoContinuar();
  }
}

function gerarUmNome() {
  const adjetivos = [
    "Shadow", "Iron", "Storm", "Dark", "Fire", "Night", "Silver", "Ghost", 
    "Blood", "Frost", "Thunder", "Swift", "Brave", "Ancient", "Toxic", 
    "Solar", "Lunar", "Cyber", "Neon", "Crystal", "Golden", "Abyssal"
  ];
  
  const animais = [
    "Wolf", "Bear", "Tiger", "Eagle", "Fox", "Dragon", "Panther", "Hawk", 
    "Lion", "Shark", "Snake", "Raven", "Viper", "Phoenix", "Griffin", 
    "Hydra", "Kraken", "Scorpion", "Stag", "Badger", "Cobra", "Falcon"
  ];
  
  const titulos = [
    "Warrior", "Mage", "Hunter", "Knight", "Rogue", "Paladin", "Lord", 
    "Seeker", "Blade", "Heart", "Stalker", "Guardian", "Warden", "Berserker", 
    "Assassin", "Titan", "Nomad", "Reaper", "Champion", "Slayer"
  ];

  const numeroAleatorio = Math.floor(Math.random() * 900) + 100;
  const tipoCombinacao = Math.floor(Math.random() * 2);
  const tituloAleatorio = titulos[Math.floor(Math.random() * titulos.length)];

  if (tipoCombinacao === 0) {
    const animalAleatorio = animais[Math.floor(Math.random() * animais.length)];
    return `${tituloAleatorio}${animalAleatorio}${numeroAleatorio}`;
  } else {
    const adjAleatorio = adjetivos[Math.floor(Math.random() * adjetivos.length)];
    return `${tituloAleatorio}${adjAleatorio}${numeroAleatorio}`;
  }
}

function gerarNome() {
  const container = document.getElementById("nomesSugeridos");
  if (!container) return;

  container.innerHTML = "";

  const nomesGerados = new Set();
  while (nomesGerados.size < 3) {
    nomesGerados.add(gerarUmNome()); // agora chama a função certa
  }

  nomesGerados.forEach(nome => {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.textContent = nome;
    botao.classList.add("nome-sugestao-btn");

    botao.addEventListener("click", () => {
      const inputNickname = document.getElementById("login_reg");
      if (inputNickname) {
        inputNickname.value = nome;
      }
      container.innerHTML = "";
    });

    container.appendChild(botao);
  });
}

const diceIcon = document.getElementById("Dice_Name");
if (diceIcon) {
  diceIcon.addEventListener("click", gerarNome); // chama a função que monta as 3 opções
}
async function createUser(event) {
  event.preventDefault();

  const nicknameValue = document.getElementById("login_reg").value.trim();
  const passwordValue = document.getElementById("password_reg").value;
  const confirmValue = document.getElementById("confirm_password_reg").value;

  if (!nicknameValue || !passwordValue || !confirmValue) {
    alert("Por favor, preencha todos os campos!");
    return;
  }

  if (passwordValue !== confirmValue) {
    alert("As senhas não coincidem!");
    return;
  }

  const avatarEscolhido = localStorage.getItem('avatarEscolhido') || 'personagem.png';

  try {
    const answer = await fetch(`${API_URL}/register`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nickname: nicknameValue,
        password: passwordValue,
        avatar: avatarEscolhido // <- envia junto
      })
    });

    const result = await answer.json();

    if (answer.ok) {
      localStorage.removeItem('avatarEscolhido');
      alert('Usuário cadastrado com sucesso!');
      window.location.href = "/fase1";
    } else {
      alert('Erro: ' + (result.erro || result.mensagem));
    }
  } catch (error) {
    console.error('Erro de conexão com o servidor:', error);
    alert('Não foi possível conectar ao servidor.');
  }
}
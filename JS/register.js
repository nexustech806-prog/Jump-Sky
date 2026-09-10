async function gerarNome() {
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
  let nomeGerado = "";

  const tituloAleatorio = titulos[Math.floor(Math.random() * titulos.length)];

  if (tipoCombinacao === 0) {
    const animalAleatorio = animais[Math.floor(Math.random() * animais.length)];
    nomeGerado = `${tituloAleatorio}${animalAleatorio}${numeroAleatorio}`;
  } else {
    const adjAleatorio = adjetivos[Math.floor(Math.random() * adjetivos.length)];
    nomeGerado = `${tituloAleatorio}${adjAleatorio}${numeroAleatorio}`;
  }

  const inputNickname = document.getElementById("login_reg");
  if (inputNickname) {
    inputNickname.value = nomeGerado;
  }
}

const diceIcon = document.getElementById("Dice_Name");
if (diceIcon) {
  diceIcon.addEventListener("click", gerarNome);
}

async function createUser(event) {
  event.preventDefault();

  const nicknameValue = document.getElementById("login_reg").value.trim();
  const passwordValue = document.getElementById("password_reg").value;
  const confirmValue = document.getElementById("confirm_password_reg").value;

  // Validação de campos vazios
  if (!nicknameValue || !passwordValue || !confirmValue) {
    alert("Por favor, preencha todos os campos!");
    return;
  }

  // Validação se as senhas conferem
  if (passwordValue !== confirmValue) {
    alert("As senhas não coincidem!");
    return;
  }

  try {
    const answer = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nickname: nicknameValue,
        password: passwordValue
      })
    });

    const result = await answer.json();
    console.log(result)

    if (answer.ok) {
      alert('Usuário cadastrado com sucesso!');
      console.log(result.mensagem);
      localStorage.setItem('idUser', result.idUser)
      window.location.href = "login.html"; 
    } else {
      alert('Erro: ' + (result.erro || result.mensagem));
    }
  } catch (error) {
    console.error('Erro de conexão com o servidor:', error);
    alert('Não foi possível conectar ao servidor.');
  }
}
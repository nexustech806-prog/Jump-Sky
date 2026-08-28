async function createUser() {
  const nicknameValue = document.getElementById("login_reg").value
  const passwordValue = document.getElementById("password_reg").value
  const confirmValue = document.getElementById("confirm_password_reg").value

if (!nicknameValue  || !passwordValue || !confirmValue) {
    alert("Por favor, preencha todos os campos!");
    return;
  }

  if (passwordValue !== confirmValue){
    alert("As senhas não coincidem!")
    return;
  } else {
    alert("Usuario Criado com Sucesso!")
  }

  try{
    const answer = await fetch('http://localhost:3000/register',{
        method: 'POST',
        headers: {
            'content-Type': 'application/json'
        },
        body: JSON.stringify({
            nickname: nicknameValue,
            password: passwordValue
        })
    });

    const result = await answer.json();
    if(answer.ok){
        alert('Usuario cadastrado com sucesso!');
        console.log(result.message);
    } else {
        alert('erro: ' + result.error);
    }
  } catch (error) {
    console.error('erro de conexao com o servidor: ', error);
    alert('Nao foi possivel conectar ao servidor.');
  }
}
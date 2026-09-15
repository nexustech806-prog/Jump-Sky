const formLogin = document.getElementById("form_log");
console.log("Formulário de login encontrado:", formLogin);

if (formLogin) {
  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("Botão de entrar clicado!"); // Para confirmar se o evento disparou

    const nickname = document.getElementById("nickname_log").value.trim();
    const password = document.getElementById("password_log").value;

    if (!nickname || !password) {
      alert("Preencha todos os campos!");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        credentials: 'include',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, password })
      });

      const data = await response.json();

     if (response.ok) {
      alert("Login efetuado com sucesso!");
      window.location.href = "/fase1";
     } else {
        alert(data.mensagem);
      }
    } catch (error) {
      console.error("Erro na conexão:", error);
      alert("Não foi possível conectar ao servidor.");
    }
  });
}
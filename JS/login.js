const formLogin = document.getElementById('form_log');
let entrando = false;

if (formLogin) {
  formLogin.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (entrando) return;
    const nickname = document.getElementById('nickname_log').value.trim();
    const password = document.getElementById('password_log').value;
    if (!nickname || !password) {
      alert('Preencha todos os campos!');
      return;
    }

    const button = document.getElementById('btn_log');
    const originalLabel = button.textContent;
    entrando = true;
    button.disabled = true;
    button.textContent = 'Entrando...';
    try {
      const { response, data } = await JumpSkyRequest(`${API_URL}/login`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, password })
      });
      if (response.ok) {
        window.location.assign('/menu');
      } else {
        alert(data.mensagem || 'Não foi possível entrar. Tente novamente.');
      }
    } catch (error) {
      alert('Não foi possível conectar. Confira sua conexão e tente novamente.');
    } finally {
      entrando = false;
      button.disabled = false;
      button.textContent = originalLabel;
    }
  });
}

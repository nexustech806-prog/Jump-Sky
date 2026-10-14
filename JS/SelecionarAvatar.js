const avatares = document.querySelectorAll(".avatar");
const continuarBtn = document.getElementById("continuar");
const mensagem = document.getElementById("mensagem");

let avatarSelecionado = null;

avatares.forEach((avatar) => {
    avatar.addEventListener("click", () => {

        // Remove a seleção de todos
        avatares.forEach((item) => {
            item.classList.remove("selecionado");
        });

        // Seleciona apenas o clicado
        avatar.classList.add("selecionado");

        avatarSelecionado = avatar.dataset.avatar;

        continuarBtn.disabled = false;
        mensagem.textContent = "Avatar selecionado!";
    });
});

continuarBtn.addEventListener("click", async () => {
    if (!avatarSelecionado) return;
    continuarBtn.disabled = true;
    avatares.forEach(avatar => { avatar.disabled = true; });
    mensagem.textContent = "Salvando seu personagem...";
    try {
        const response = await fetch(`${API_URL}/api/avatar`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ avatar: avatarSelecionado })
        });
        if (response.status === 401) {
            mensagem.textContent = 'Entre na sua conta para salvar o personagem.';
            return;
        }
        if (!response.ok) throw new Error('Falha ao salvar');
        mensagem.textContent = 'Personagem salvo!';
        window.location.href = '/menu';
    } catch (error) {
        mensagem.textContent = 'Não foi possível salvar. Confira a conexão e tente novamente.';
    } finally {
        continuarBtn.disabled = false;
        avatares.forEach(avatar => { avatar.disabled = false; });
    }
});

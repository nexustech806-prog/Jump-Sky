const avatares = document.querySelectorAll(".avatar");
const continuarBtn = document.getElementById("continuar");
const mensagem = document.getElementById("mensagem");

let avatarSelecionado = null;

avatares.forEach((avatar) => {
    avatar.addEventListener("click", () => {

        // Remove a seleção anterior
        avatares.forEach((item) => {
            item.classList.remove("selecionado");
        });

        // Marca o novo avatar
        avatar.classList.add("selecionado");

        avatarSelecionado = avatar.dataset.avatar;

        mensagem.textContent = "Avatar selecionado!";
        continuarBtn.disabled = false;
    });
});

continuarBtn.addEventListener("click", () => {
    if (!avatarSelecionado) {
        return;
    }

    localStorage.setItem("avatarSelecionado", avatarSelecionado);

    window.location.href = "/fase1";
});
// ========================================
// SISTEMA GLOBAL DE ÁUDIO - JUMP SKY
// ========================================

const SOUND_STORAGE_KEY = "soundEnabled";
const VOLUME_STORAGE_KEY = "soundVolume";

const DEFAULT_VOLUME = 0.6;


// ========================================
// CAMINHOS DOS EFEITOS SONOROS
// ========================================

const gameSounds = {
    correct: new Audio("/audio/correct.mp3"),
    wrong: new Audio("/audio/wrong.mp3"),
    complete: new Audio("/audio/complete.mp3"),
    timeout: new Audio("/audio/timeout.mp3"),
    record: new Audio("/audio/record.mp3")
};


// ========================================
// VOLUME
// ========================================

function getSoundVolume() {

    const savedVolume =
        localStorage.getItem(
            VOLUME_STORAGE_KEY
        );

    if (savedVolume === null) {
        return DEFAULT_VOLUME;
    }

    const volume =
        Number(savedVolume);

    if (
        Number.isNaN(volume) ||
        volume < 0 ||
        volume > 1
    ) {
        return DEFAULT_VOLUME;
    }

    return volume;
}


function setSoundVolume(volume) {

    const normalizedVolume =
        Math.max(
            0,
            Math.min(1, Number.isFinite(Number(volume)) ? Number(volume) : DEFAULT_VOLUME)
        );

    localStorage.setItem(
        VOLUME_STORAGE_KEY,
        String(normalizedVolume)
    );

    Object.values(gameSounds).forEach(
        sound => {

            sound.volume =
                normalizedVolume;

        }
    );

    updateVolumeControl();
    syncBackgroundMusic();
}


// ========================================
// CONFIGURAÇÕES DOS SONS
// ========================================

Object.values(gameSounds).forEach(
    sound => {

        sound.preload = "auto";

        sound.volume =
            getSoundVolume();

    }
);


// ========================================
// VERIFICA SE O SOM ESTÁ ATIVADO
// ========================================

function isSoundEnabled() {

    const savedPreference =
        localStorage.getItem(
            SOUND_STORAGE_KEY
        );

    if (savedPreference === null) {
        return true;
    }

    return savedPreference === "true";
}


// ========================================
// SALVA A PREFERÊNCIA
// ========================================

function setSoundEnabled(enabled) {

    localStorage.setItem(
        SOUND_STORAGE_KEY,
        String(enabled)
    );

    updateSoundButton();
    updateGameSoundButton();
    if (!enabled) stopAllSounds();
    syncBackgroundMusic();
}


// ========================================
// LIGA / DESLIGA
// ========================================

function toggleSound() {

    const newState =
        !isSoundEnabled();

    setSoundEnabled(newState);

    if (!newState) {
        stopAllSounds();
    }
}


// ========================================
// TOCA UM EFEITO
// ========================================

function playSound(soundName) {

    if (!isSoundEnabled() || localStorage.getItem("feedbackSonoro") === "false") {
        return;
    }

    const sound =
        gameSounds[soundName];

    if (!sound) {

        console.warn(
            `Som não encontrado: ${soundName}`
        );

        return;
    }

    // Garante que o volume atual seja usado
    sound.volume =
        getSoundVolume();

    sound.currentTime = 0;

    activeEffects.add(sound);
    updateMusicVolume();
    sound.play().catch(
        error => {
            activeEffects.delete(sound);
            updateMusicVolume();

            console.warn(
                "Não foi possível reproduzir o som:",
                error
            );

        }
    );
}


// ========================================
// PARA TODOS OS SONS
// ========================================

function stopAllSounds() {
    backgroundMusic.pause();
    activeEffects.clear();
    updateMusicVolume();

    Object.values(gameSounds).forEach(
        sound => {

            sound.pause();

            sound.currentTime = 0;

        }
    );
}


// ========================================
// ATUALIZA BOTÃO DO MENU
// ========================================

function updateSoundButton() {

    const toggleSom =
        document.getElementById(
            "toggleSom"
        );

    if (!toggleSom) {
        return;
    }

    const enabled =
        isSoundEnabled();

    toggleSom.textContent =
        enabled
            ? "🔊"
            : "🔇";

    toggleSom.title =
        enabled
            ? "Desativar som do jogo"
            : "Ativar som do jogo";

    toggleSom.setAttribute(
        "aria-label",
        enabled
            ? "Desativar som do jogo"
            : "Ativar som do jogo"
    );
}


// ========================================
// ATUALIZA BOTÃO DE SOM DAS FASES
// ========================================

function updateGameSoundButton() {

    const button =
        document.getElementById(
            "gameSoundToggle"
        );

    if (!button) {
        return;
    }

    const enabled =
        isSoundEnabled();

    button.textContent =
        enabled
            ? "🔊 Ligado"
            : "🔇 Desligado";

    button.setAttribute(
        "aria-pressed",
        String(enabled)
    );
}


// ========================================
// ATUALIZA CONTROLE DE VOLUME
// ========================================

function updateVolumeControl() {

    const volumeSlider =
        document.getElementById(
            "volumeSlider"
        );

    const volumeValue =
        document.getElementById(
            "volumeValue"
        );

    if (
        !volumeSlider ||
        !volumeValue
    ) {
        return;
    }

    const volume =
        getSoundVolume();

    const percentage =
        Math.round(
            volume * 100
        );

    volumeSlider.value =
        percentage;

    volumeValue.textContent =
        `${percentage}%`;
}


// ========================================
// INICIALIZA CONTROLES
// ========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        // --------------------------------
        // BOTÃO DE SOM DO MENU
        // --------------------------------

        updateSoundButton();

        const toggleSom =
            document.getElementById(
                "toggleSom"
            );

        if (toggleSom) {

            toggleSom.addEventListener(
                "click",
                toggleSound
            );

        }


        // --------------------------------
        // CONFIGURAÇÕES DAS FASES
        // --------------------------------

        const settingsBtn =
            document.getElementById(
                "settingsBtn"
            );

        const settingsPanel =
            document.getElementById(
                "settingsPanel"
            );

        const gameSoundToggle =
            document.getElementById(
                "gameSoundToggle"
            );


        // Abrir / fechar configurações

        if (
            settingsBtn &&
            settingsPanel
        ) {

            settingsBtn.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    settingsPanel.classList.toggle(
                        "show"
                    );

                }
            );


            settingsPanel.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                }
            );


            // Fecha ao clicar fora

            document.addEventListener(
                "click",
                () => {

                    settingsPanel.classList.remove(
                        "show"
                    );

                }
            );

        }


        // --------------------------------
        // BOTÃO LIGAR / DESLIGAR SOM
        // --------------------------------

        if (gameSoundToggle) {

            updateGameSoundButton();

            gameSoundToggle.addEventListener(
                "click",
                () => {

                    toggleSound();

                    updateGameSoundButton();

                }
            );

        }


        // --------------------------------
        // CONTROLE DE VOLUME
        // --------------------------------

        const volumeSlider =
            document.getElementById(
                "volumeSlider"
            );

        if (volumeSlider) {

            updateVolumeControl();

            volumeSlider.addEventListener(
                "input",
                () => {

                    const volume =
                        Number(
                            volumeSlider.value
                        ) / 100;

                    setSoundVolume(
                        volume
                    );

                }
            );

        }

    }
);
// Trilha instrumental em loop, sempre abaixo dos efeitos.
const backgroundMusic = new Audio("/audio/background.wav");
backgroundMusic.loop = true;
backgroundMusic.preload = "auto";
const activeEffects = new Set();
let musicRequested = false;
let musicPlayPending = false;

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("gameSoundToggle")) startBackgroundMusic();
});

function updateMusicVolume() {
    backgroundMusic.volume = getSoundVolume() * (activeEffects.size ? 0.07 : 0.25);
}

function shouldPlayMusic() {
    return musicRequested && isSoundEnabled() && getSoundVolume() > 0 && !document.hidden;
}

function syncBackgroundMusic() {
    updateMusicVolume();
    if (!shouldPlayMusic()) {
        backgroundMusic.pause();
        return;
    }
    if (!backgroundMusic.paused || musicPlayPending) return;
    musicPlayPending = true;
    backgroundMusic.play().then(() => {
        // A preferência pode mudar enquanto o navegador carrega o áudio.
        if (!shouldPlayMusic()) backgroundMusic.pause();
    }).catch(() => {
        // Autoplay bloqueado: tentar novamente no próximo gesto do jogador.
    }).finally(() => { musicPlayPending = false; });
}

function startBackgroundMusic() {
    musicRequested = true;
    syncBackgroundMusic();
}

function stopBackgroundMusic() {
    musicRequested = false;
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
}

Object.values(gameSounds).forEach(sound => {
    ["ended", "pause", "error"].forEach(eventName => {
        sound.addEventListener(eventName, () => {
            activeEffects.delete(sound);
            updateMusicVolume();
        });
    });
});

// Também dá prioridade a elementos de áudio/vídeo de instruções.
document.addEventListener("play", event => {
    if (event.target instanceof HTMLMediaElement) {
        activeEffects.add(event.target);
        updateMusicVolume();
    }
}, true);
["ended", "pause", "error"].forEach(eventName => {
    document.addEventListener(eventName, event => {
        activeEffects.delete(event.target);
        updateMusicVolume();
    }, true);
});
document.addEventListener("click", syncBackgroundMusic);
document.addEventListener("keydown", syncBackgroundMusic);
document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAllSounds();
    syncBackgroundMusic();
});
window.addEventListener("pagehide", () => { stopAllSounds(); });
window.addEventListener("pageshow", syncBackgroundMusic);
window.addEventListener("storage", event => {
    if (event.key === null || [SOUND_STORAGE_KEY, VOLUME_STORAGE_KEY, "feedbackSonoro"].includes(event.key)) {
        Object.values(gameSounds).forEach(sound => { sound.volume = getSoundVolume(); });
        if (!isSoundEnabled() || localStorage.getItem("feedbackSonoro") === "false") stopAllSounds();
        updateSoundButton();
        updateGameSoundButton();
        updateVolumeControl();
        syncBackgroundMusic();
    }
});

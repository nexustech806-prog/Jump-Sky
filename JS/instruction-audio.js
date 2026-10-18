(() => {
    const audioFilesByPhase = {
        "1": "/audio/fase-1.mp3",
        "2": "/audio/fase-2.mp3",
        "3": "/audio/fase-3.mp3",
        "4": "/audio/fase-4.mp3",
        bonus: "/audio/fase-bonus.mp3"
    };

    const audioFile = audioFilesByPhase[document.body.dataset.phase];
    const button = document.getElementById("playInstructions");
    const status = document.getElementById("instructionAudioStatus");
    if (!audioFile || !button || !status) return;

    const instructionAudio = new Audio(audioFile);
    instructionAudio.preload = "none";
    registerNarration(instructionAudio);

    let playbackId = 0;

    function finishPlayback(id) {
        if (id !== playbackId) return;
        button.textContent = "🔊 Ouvir instruções novamente";
        document.dispatchEvent(new Event("instructionaudio:end"));
    }

    function stopPlayback(message = "") {
        playbackId++;
        instructionAudio.pause();
        instructionAudio.currentTime = 0;
        button.textContent = "🔊 Ouvir instruções";
        if (message) status.textContent = message;
        document.dispatchEvent(new Event("instructionaudio:end"));
    }

    button.addEventListener("click", async () => {
        if (!isSoundEnabled()) {
            status.textContent = "Ative o som geral nas configurações para ouvir as instruções.";
            return;
        }

        const currentPlaybackId = ++playbackId;
        instructionAudio.pause();
        instructionAudio.currentTime = 0;
        instructionAudio.volume = getChannelVolume("voice");

        document.dispatchEvent(new Event("instructionaudio:start"));
        button.textContent = "🔁 Repetir instruções";
        status.textContent = "Reproduzindo as instruções.";

        try {
            await instructionAudio.play();
        } catch (error) {
            if (currentPlaybackId !== playbackId) return;
            status.textContent = "Não foi possível carregar o áudio. Confira se o MP3 foi adicionado à pasta /audio.";
            finishPlayback(currentPlaybackId);
        }
    });

    instructionAudio.addEventListener("ended", () => {
        status.textContent = "Instruções concluídas. Você pode ouvi-las novamente quando quiser.";
        finishPlayback(playbackId);
    });

    instructionAudio.addEventListener("error", () => {
        status.textContent = "Não foi possível carregar o áudio. Confira se o MP3 foi adicionado à pasta /audio.";
        finishPlayback(playbackId);
    });

    document.addEventListener("instructionaudio:stop", () => {
        stopPlayback("Reprodução interrompida. Você pode ouvir as instruções novamente quando quiser.");
    });
})();

/* Decode images before revealing them; failed assets never block gameplay. */
(() => {
    const pending = new Map();
    function load(src) {
        if (!pending.has(src)) pending.set(src, new Promise(resolve => {
            const image = new Image();
            const timeout = setTimeout(() => resolve(false), 8000);
            image.onload = async () => {
                try { if (image.decode) await image.decode(); } catch (_) {}
                clearTimeout(timeout); resolve(true);
            };
            image.onerror = () => { clearTimeout(timeout); resolve(false); };
            image.src = src;
        }));
        return pending.get(src);
    }
    window.JumpSkyAssets = { load };
})();

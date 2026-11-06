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

// Explicit start/end positions keep travel smooth even when CSS transitions are reset.
(() => {
    const movements = new WeakMap();
    window.moveGameCharacter = (character, left, bottom) => {
        const previous = movements.get(character);
        if (previous && previous.left === left && previous.bottom === bottom) return;
        const style = getComputedStyle(character);
        let fromLeft = parseFloat(style.left);
        let fromBottom = parseFloat(style.bottom);
        if (style.transform && style.transform !== 'none' && window.DOMMatrixReadOnly) {
            const matrix = new window.DOMMatrixReadOnly(style.transform);
            fromLeft += matrix.m41;
            fromBottom -= matrix.m42;
        }
        if (previous && previous.animation) previous.animation.cancel();
        character.style.transition = 'none';
        character.style.animation = 'none';
        character.style.left = left + 'px';
        character.style.bottom = bottom + 'px';
        const state = { left, bottom, animation: null };
        movements.set(character, state);
        // Initial placement is immediate; subsequent travel interpolates from the visible position.
        if (!previous || !Number.isFinite(fromLeft) || !Number.isFinite(fromBottom) || !character.animate) return;
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const duration = reduced ? 250 : (document.body.dataset.phase === 'bonus' ? 650 : 700);
        const dx = fromLeft - left, dy = bottom - fromBottom;
        const height = !reduced && character.classList.contains('jumping') ? 55 : 0;
        const frames = Array.from({ length: 21 }, (_, i) => {
            const t = i / 20;
            return { transform: 'translate3d(' + (dx * (1-t)) + 'px,' + (dy * (1-t) - 4 * height * t * (1-t)) + 'px,0)' };
        });
        state.animation = character.animate(frames, { duration, easing: 'linear' });
        state.animation.onfinish = () => { state.animation = null; };
    };
})();

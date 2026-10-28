// Re-align the character when wrapping text changes the scene's available height.
// The phase scripts already handle window resize without resetting game state.
(() => {
    const scene = document.querySelector('[data-game-phase] .scene');
    if (!scene || !window.ResizeObserver) return;
    let frame;
    const observer = new ResizeObserver(() => {
        scene.style.setProperty('--scene-height', scene.clientHeight + 'px');
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    });
    observer.observe(scene);
})();

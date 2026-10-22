// The game remains responsible for opening and closing its dialogs.
// This helper follows those changes and keeps keyboard focus in the active dialog.
(() => {
    const dialogs = [...document.querySelectorAll('[data-game-dialog]')];
    if (!dialogs.length) return;

    const selector = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';
    let active = null;
    let previousFocus = null;
    let lastFocus = document.activeElement;
    let inertElements = [];

    function visible(element) {
        return element && element.isConnected && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
    }

    function controls(dialog) {
        return [...dialog.querySelectorAll(selector)].filter(visible);
    }

    function focusFirst(dialog) {
        const target = dialog.querySelector('[data-dialog-initial-focus]');
        (visible(target) && !target.disabled ? target : controls(dialog)[0] || dialog).focus();
    }

    function restoreBackground() {
        inertElements.forEach(([element, value]) => { element.inert = value; });
        inertElements = [];
    }

    function protectBackground(dialog) {
        for (let element = dialog; element.parentElement && element !== document.body; element = element.parentElement) {
            [...element.parentElement.children].forEach(sibling => {
                if (sibling === element || /^(SCRIPT|STYLE|LINK)$/.test(sibling.tagName)) return;
                inertElements.push([sibling, sibling.inert]);
                sibling.inert = true;
            });
        }
    }

    function syncDialogs() {
        const next = dialogs.filter(visible).at(-1) || null;
        if (next === active) {
            if (active && (!active.contains(document.activeElement) || document.activeElement.disabled || !visible(document.activeElement))) focusFirst(active);
            return;
        }
        const wasActive = active;
        active = next;
        restoreBackground();
        if (active) {
            if (!wasActive) previousFocus = document.activeElement !== document.body ? document.activeElement : lastFocus;
            protectBackground(active);
            focusFirst(active);
        } else if (wasActive) {
            const fallback = document.querySelector('.answer-btn:not(:disabled)') || document.getElementById('question');
            const target = visible(previousFocus) && !previousFocus.disabled ? previousFocus : fallback;
            if (visible(target)) target.focus();
            previousFocus = null;
        }
    }

    document.addEventListener('focusin', event => {
        if (active && !active.contains(event.target)) focusFirst(active);
        else if (!active) lastFocus = event.target;
    });

    document.addEventListener('keydown', event => {
        if (!active) return;
        if (event.key === 'Escape') {
            const close = active.querySelector('[data-dialog-close]');
            if (close && !close.disabled) {
                event.preventDefault();
                event.stopImmediatePropagation();
                // Use the game's close handler so it also re-enables the answers.
                close.click();
            }
        } else if (event.key === 'Tab') {
            const items = controls(active);
            const first = items[0];
            const last = items.at(-1);
            if (!items.length) {
                event.preventDefault();
                active.focus();
            } else if (event.shiftKey && (document.activeElement === first || !items.includes(document.activeElement))) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && (document.activeElement === last || !items.includes(document.activeElement))) {
                event.preventDefault();
                first.focus();
            }
        }
    }, true);

    const observer = new MutationObserver(syncDialogs);
    dialogs.forEach(dialog => {
        observer.observe(dialog, { attributes: true, subtree: true, attributeFilter: ['class', 'style', 'hidden', 'disabled'] });
    });
    syncDialogs();
})();

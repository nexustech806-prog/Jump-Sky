// Keep the deadline active until both the response and its JSON body arrive.
(function (root) {
    root.JumpSkyRequest = async function (url, options = {}) {
        const controller = new AbortController();
        let timer;
        try {
            return await Promise.race([
                (async () => {
                    const response = await fetch(url, { ...options, signal: controller.signal });
                    const data = await response.json();
                    return { response, data };
                })(),
                new Promise((resolve, reject) => {
                    timer = setTimeout(() => {
                        controller.abort();
                        reject(Object.assign(new Error('Tempo de resposta excedido'), { name: 'TimeoutError' }));
                    }, 15000);
                })
            ]);
        } finally {
            clearTimeout(timer);
        }
    };
})(globalThis);

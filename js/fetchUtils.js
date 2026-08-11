async function fetchConReintento(url, opciones = {}, intentos = 3, esperaMs = 2000, timeoutMs = 20000) {
    for (let intento = 1; intento <= intentos; intento++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, { ...opciones, signal: controller.signal });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error(`Status ${response.status}`);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            console.warn(`Intento ${intento}/${intentos} falló para ${url}:`, error.message);
            if (intento === intentos) throw error;
            await new Promise(resolve => setTimeout(resolve, esperaMs));
        }
    }
}
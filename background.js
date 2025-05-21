chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case 'saveSetting':
            chrome.storage.sync.set({ [message.data.key]: message.data.value }, () => {
                if (chrome.runtime.lastError) {
                    console.error("Error al guardar la configuración: estas moviendo todo muy rapido este error no es fatal y no afecta en nada", chrome.runtime.lastError);
                }
            });
            break; // ¡Esta línea es crucial!

        case 'loadSettings':
            chrome.storage.sync.get([
                'volume',
                'barColor',
                'waveLineColor',
                'pokerChipColor',
                'intensity',
                'barIntensity',
                'waveIntensity',
                'triangleSize',
                'innerTriangleColor', // ¡Añadido!
                'outerTriangleColor', // ¡Añadido!
                'visualizerType',
                'currentSongIndex'
            ], (result) => {
                sendResponse(result);
            });
            return true; // Necesario para sendResponse asíncrono
    }
});
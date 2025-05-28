// background.js (Simplificado, solo para configuraciones no-handle)

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case 'saveSetting':
            chrome.storage.sync.set({ [message.data.key]: message.data.value }, () => {
                if (chrome.runtime.lastError) {
                    console.error("Error al guardar la configuración (sync):", chrome.runtime.lastError);
                    sendResponse({ success: false, error: chrome.runtime.lastError.message });
                } else {
                    sendResponse({ success: true });
                }
            });
            return true;

        case 'loadSettings':
            chrome.storage.sync.get([
                'volume', 'barColor', 'waveLineColor', 'pokerChipColor', 'intensity',
                'barIntensity', 'waveIntensity', 'triangleSize', 'innerTriangleColor',
                'outerTriangleColor', 'visualizerType', 'currentSongIndex'
            ], (syncResult) => {
                // No hay playlistHandles aquí porque no se pueden guardar.
                sendResponse(syncResult);
            });
            return true;

        default:
            console.warn("Acción de mensaje desconocida:", message.action);
    }
});
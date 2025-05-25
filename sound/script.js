document.addEventListener('DOMContentLoaded', () => {
    const currentUrl = window.location.href;
    const newTabPageUrl = chrome.runtime.getURL("sound/index.html");

    if (currentUrl === newTabPageUrl) {
        const audioPlayer = document.getElementById('audioPlayer');
        const canvas = document.getElementById('audioSpectrumCanvas');
        const ctx = canvas.getContext('2d');
        const controlsPanel = document.getElementById('controlsPanel');
        const openControlsButton = document.getElementById('openControlsButton');
        const closeControlsButton = document.getElementById('closeControlsButton');
        const togglePlayPauseButton = document.getElementById('togglePlayPauseButton');
        const prevSongButton = document.getElementById('prevSongButton');
        const nextSongButton = document.getElementById('nextSongButton');
        const volumeSliderInline = document.getElementById('volumeSliderInline');
        const songSelect = document.getElementById('songSelect');
        const songProgressBar = document.getElementById('songProgressBar');
        const currentTimeSpan = document.getElementById('currentTime');
        const totalTimeSpan = document.getElementById('totalTime');
        const barColorSelect = document.getElementById('barColorSelect');
        const waveLineColorSelect = document.getElementById('waveLineColorSelect');
        const pokerChipColorSelect = document.getElementById('pokerChipColorSelect');
        const intensitySlider = document.getElementById('intensitySlider');
        const visualizerTypeSelect = document.getElementById('visualizerTypeSelect');
        const barIntensitySlider = document.getElementById('barIntensitySlider');
        const waveIntensitySlider = document.getElementById('waveIntensitySlider');
        const triangleSizeSlider = document.getElementById('triangleSizeSlider');
        const innerTriangleColorSelect = document.getElementById('innerTriangleColorSelect');
        const outerTriangleColorSelect = document.getElementById('outerTriangleColorSelect');
        const resetDefaultsButton = document.getElementById('resetDefaultsButton');
        const addSongsButton = document.getElementById('addSongsButton');

        let audioContext;
        let analyser;
        let source;
        let isPlaying = false;
        let dataArray; // Declarar dataArray aquí para que draw pueda verlo

        let playlist = []; // Esta playlist ahora se reconstruye en cada sesión
        // Ya no necesitamos persistedFileHandles globalmente para persistencia

        const defaultSettings = {
            volume: 0.5,
            barColor: 'dynamic',
            waveLineColor: 'dynamic',
            pokerChipColor: 'random',
            intensity: 1,
            barIntensity: 1,
            waveIntensity: 1,
            triangleSize: 1,
            innerTriangleColor: 'white',
            outerTriangleColor: 'yellow',
            visualizerType: ['all'],
            currentSongIndex: 0,
            defaultPlaylistUrls: [
                chrome.runtime.getURL('sound/audio/eru.mp3'), 
                chrome.runtime.getURL('sound/audio/gerbera.mp3'),  
                chrome.runtime.getURL('sound/audio/MEGITSUNE.mp3'),
                chrome.runtime.getURL('sound/audio/Odo.mp3'),
                chrome.runtime.getURL('sound/audio/AI.mp3')
            ]
        };

        let currentBarColor = defaultSettings.barColor;
        let currentWaveLineColor = defaultSettings.waveLineColor;
        let currentPokerChipColor = defaultSettings.pokerChipColor;
        let currentIntensity = defaultSettings.intensity;
        let currentBarIntensity = defaultSettings.barIntensity;
        let currentWaveIntensity = defaultSettings.waveIntensity;
        let currentTriangleSize = defaultSettings.triangleSize;
        let currentInnerTriangleColor = defaultSettings.innerTriangleColor;
        let currentOuterTriangleColor = defaultSettings.outerTriangleColor;
        let currentVisualizerTypes = defaultSettings.visualizerType;
        let currentSongIndex = defaultSettings.currentSongIndex;

        const setCanvasDimensions = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        setCanvasDimensions();
        window.addEventListener('resize', setCanvasDimensions);

        // --- Función DRAW: Debe estar definida antes de que se llame ---
        const draw = () => {
            // Si el audio no está reproduciéndose y no hay un analizador activo, simplemente limpia el canvas.
            if (!isPlaying && (!analyser || !audioContext)) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                return;
            }

            // Si está reproduciendo y el analizador no está inicializado, intenta inicializarlo.
            if (isPlaying && !analyser) {
                initAudio();
                if (!analyser) { // Si aún no se pudo inicializar (ej. sin audioContext), no dibujes y sal.
                    requestAnimationFrame(draw); // Sigue intentando en el siguiente frame
                    return;
                }
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const totalHeight = canvas.height;
            const totalWidth = canvas.width;

            // Asegúrate de que dataArray esté lleno antes de usarlo para dibujar
            if (analyser && isPlaying) {
                analyser.getByteFrequencyData(dataArray);
            } else {
                // Si no hay audio reproduciéndose, dataArray podría estar vacío o con ceros.
                // Podrías opcionalmente llenar dataArray con ceros para un visualizador estático sin sonido.
                dataArray = dataArray || new Uint8Array(analyser ? analyser.frequencyBinCount : 0); // Asegura que existe y tiene tamaño
                dataArray.fill(0); // Llénalo de ceros si no hay audio
            }


            const drawAll = currentVisualizerTypes.includes('all');
            const drawBars = drawAll || currentVisualizerTypes.includes('bars');
            const drawWavy = drawAll || currentVisualizerTypes.includes('wavy');
            const drawChips = drawAll || currentVisualizerTypes.includes('chips');
            const drawTriangles = drawAll || currentVisualizerTypes.includes('triangles');

            if (drawBars) {
                const barWidth = (canvas.width / dataArray.length) * 2.5;
                let xBar = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    const barHeight = dataArray[i] * 0.5 * currentIntensity * currentBarIntensity;
                    const intensity = dataArray[i] / 255;
                    let hue;
                    switch (currentBarColor) {
                        case 'blue': hue = 200; break;
                        case 'green': hue = 120; break;
                        case 'red': hue = 0; break;
                        case 'purple': hue = 270; break;
                        case 'orange': hue = 30; break;
                        case 'cyan': hue = 180; break;
                        case 'magenta': hue = 300; break;
                        case 'yellow': hue = 60; break;
                        case 'dynamic':
                        default:
                            if (intensity < 0.70) { hue = 200; }
                            else if (intensity < 0.75) { hue = 60; }
                            else { hue = 0; }
                            break;
                    }
                    const saturation = 70 + (intensity * 30);
                    const lightness = 30 + (intensity * 40);
                    ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
                    ctx.fillRect(xBar, totalHeight - barHeight, barWidth, barHeight);
                    if (i % 5 === 0 && barHeight > 10) {
                        const reflectiveHeight = barHeight * 0.1;
                        ctx.fillStyle = `rgba(255, 255, 255, ${intensity * 0.3})`;
                        ctx.fillRect(xBar, totalHeight - barHeight - reflectiveHeight, barWidth, reflectiveHeight);
                    }
                    xBar += barWidth + 0.1;
                }
            }
            if (drawTriangles && dataArray[10] > 10) {
                if (isNaN(currentTriangleSize) || !isFinite(currentTriangleSize)) {
                    console.warn("Se detectó un currentTriangleSize inválido, restableciendo al valor por defecto.");
                    currentTriangleSize = defaultSettings.triangleSize;
                    triangleSizeSlider.value = currentTriangleSize;
                    saveSetting('triangleSize', currentTriangleSize);
                }
                const overallIntensity = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length / 255;
                const size = (200 + (overallIntensity * 300 * currentIntensity)) * currentTriangleSize;
                const alpha = 0.1 + (overallIntensity * 0.4);
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                const outerColor = getTriangleColor(currentOuterTriangleColor, alpha);
                const innerColor = getTriangleColor(currentInnerTriangleColor, alpha * 1.5);

                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.rotate(Math.PI);

                ctx.beginPath();
                ctx.moveTo(0, -size / 2);
                ctx.lineTo(size / 2 * Math.sqrt(3) / 2, size / 2 / 2);
                ctx.lineTo(-size / 2 * Math.sqrt(3) / 2, size / 2 / 2);
                ctx.closePath();
                ctx.fillStyle = outerColor;
                ctx.fill();

                const innerSize = size * 0.5;
                ctx.beginPath();
                ctx.moveTo(0, -innerSize / 2);
                ctx.lineTo(innerSize / 2 * Math.sqrt(3) / 2, innerSize / 2 / 2);
                ctx.lineTo(-innerSize / 2 * Math.sqrt(3) / 2, innerSize / 2 / 2);
                ctx.closePath();
                ctx.fillStyle = innerColor;
                ctx.fill();

                ctx.restore();
            }

            if (drawWavy) {
                let waveHue;
                let strokeStyleValue;
                switch (currentWaveLineColor) {
                    case 'white': strokeStyleValue = 'rgba(255, 255, 255, 0.7)'; break;
                    case 'orange': waveHue = 30; strokeStyleValue = `hsl(${waveHue}, 100%, 50%, 0.7)`; break;
                    case 'pink': waveHue = 330; strokeStyleValue = `hsl(${waveHue}, 100%, 50%, 0.7)`; break;
                    case 'red': waveHue = 0; strokeStyleValue = `hsl(${waveHue}, 100%, 50%, 0.7)`; break;
                    case 'green': waveHue = 120; strokeStyleValue = `hsl(${waveHue}, 100%, 50%, 0.7)`; break;
                    case 'blue': waveHue = 240; strokeStyleValue = `hsl(${waveHue}, 100%, 50%, 0.7)`; break;
                    case 'yellow': waveHue = 60; strokeStyleValue = `hsl(${waveHue}, 100%, 50%, 0.7)`; break;
                    case 'purple': waveHue = 270; strokeStyleValue = `hsl(${waveHue}, 100%, 50%, 0.7)`; break;
                    case 'cyan': waveHue = 180; strokeStyleValue = `hsl(${waveHue}, 100%, 50%, 0.7)`; break;
                    case 'magenta': waveHue = 300; strokeStyleValue = `hsl(${waveHue}, 100%, 50%, 0.7)`; break;
                    case 'dynamic':
                    default:
                        const averageFrequency = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
                        waveHue = 200 + (averageFrequency / 255) * 50;
                        strokeStyleValue = `hsl(${waveHue}, 70%, 60%, 0.7)`;
                        break;
                }
                ctx.lineWidth = 4 * currentIntensity * currentWaveIntensity;
                ctx.strokeStyle = strokeStyleValue;
                ctx.beginPath();
                const sliceWidth = canvas.width * 2.0 / dataArray.length;
                let lineX = 0;

                for (let i = 0; i < dataArray.length; i++) {
                    const v = dataArray[i] / 128.0;
                    const y = (v * canvas.height / 1);

                    if (i === 0) {
                        ctx.moveTo(lineX, y);
                    } else {
                        ctx.lineTo(lineX, y);
                    }
                    lineX += sliceWidth;
                }
                ctx.lineTo(canvas.width, canvas.height / 2);
                ctx.stroke();
            }

            if (drawChips) {
                const overallVolume = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
                if (pokerChips.length < MAX_POKER_CHIPS && overallVolume > 70) {
                    const chipValue = Math.floor(Math.random() * 100) + 1;
                    pokerChips.push(createPokerChip(chipValue, totalWidth, totalHeight));
                }

                for (let i = 0; i < pokerChips.length; i++) {
                    const chip = pokerChips[i];
                    chip.x += chip.vx;
                    chip.y += chip.vy;
                    chip.vy += 0.1;

                    if (chip.y > totalHeight + chip.baseRadius * 2 || (Math.abs(chip.vx) < 0.1 && Math.abs(chip.vy) < 0.1 && chip.y > totalHeight - chip.baseRadius - 5)) {
                        pokerChips.splice(i, 1);
                        i--;
                        continue;
                    }

                    const intensity = chip.value / 100;
                    let hue;
                    let chipCalculatedColor;
                    let saturation = 0;
                    let lightness = 0;

                    switch (currentPokerChipColor) {
                        case 'green': hue = 120; break;
                        case 'gray': chipCalculatedColor = `rgba(150, 150, 150, ${1 - intensity * 0.5})`; break;
                        case 'gold': hue = 40; break;
                        case 'red': hue = 0; break;
                        case 'blue': hue = 240; break;
                        case 'yellow': hue = 60; break;
                        case 'purple': hue = 270; break;
                        case 'cyan': hue = 180; break;
                        case 'magenta': hue = 300; break;
                        case 'orange': hue = 30; break;
                        case 'random':
                        default:
                            switch (chip.colorType) {
                                case 'red': hue = 0 + (intensity * 20); break;
                                case 'yellow': hue = 60 + (intensity * 20); break;
                                case 'blue':
                                default: hue = 200 + (intensity * 4); break;
                            }
                            break;
                    }

                    if (currentPokerChipColor !== 'gray') {
                        const naburaSaturation = Math.min(100, saturation + 10);
                        const naburaLightness = Math.min(100, lightness + 10);
                        chipCalculatedColor = `hsl(${hue}, ${naburaSaturation}%, ${naburaLightness}%)`;
                    }

                    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                    ctx.shadowBlur = 10;
                    ctx.shadowOffsetX = 3;
                    ctx.shadowOffsetY = 3;

                    ctx.beginPath();
                    ctx.arc(chip.x, chip.y, chip.baseRadius, 0, 2 * Math.PI);
                    ctx.fillStyle = chipCalculatedColor;
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.closePath();

                    const naburaRadius = chip.baseRadius * 0.6;
                    ctx.beginPath();
                    ctx.arc(chip.x, chip.y, naburaRadius, 0, 2 * Math.PI);
                    const naburaGradient = ctx.createRadialGradient(
                        chip.x - naburaRadius * 0.3,
                        chip.y - naburaRadius * 0.3,
                        naburaRadius * 0.1,
                        chip.x,
                        chip.y,
                        naburaRadius
                    );

                    if (currentPokerChipColor !== 'gray') {
                        const naburaSaturation = Math.min(100, saturation + 10);
                        const naburaLightness = Math.min(100, lightness + 10);
                        naburaGradient.addColorStop(0, `hsl(${hue}, ${naburaSaturation}%, ${naburaLightness}%)`);
                        naburaGradient.addColorStop(1, chipCalculatedColor);
                    } else {
                        naburaGradient.addColorStop(0, `rgba(200, 200, 200, ${1 - intensity * 0.3})`);
                        naburaGradient.addColorStop(1, chipCalculatedColor);
                    }
                    ctx.fillStyle = naburaGradient;
                    ctx.fill();
                    ctx.closePath();

                    ctx.fillStyle = 'white';
                    ctx.font = `bold ${16}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(chip.value, chip.x, chip.y);

                    ctx.shadowColor = 'transparent';
                    ctx.shadowBlur = 0;
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = 0;
                }
            }

            // SOLO SOLICITA EL SIGUIENTE FRAME SI ESTÁ REPRODUCIÉNDOSE
            if (isPlaying) {
                requestAnimationFrame(draw);
            }
        };
        // --- FIN de la función DRAW ---

        const saveSetting = (key, value) => {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage({
                    action: 'saveSetting',
                    data: { key: key, value: value }
                });
            } else {
                console.warn("chrome.runtime.sendMessage no está disponible. La configuración no se guardará de forma persistente.");
            }
        };

        // --- populateSongSelect: Ahora recibe handles para la sesión actual ---
        const populateSongSelect = (currentSessionHandles = []) => {
            songSelect.innerHTML = '';

            // La playlist siempre incluye las URLs predeterminadas y las canciones de la sesión actual
            playlist = [
                ...defaultSettings.defaultPlaylistUrls,
                ...currentSessionHandles.map(item => item.handle)
            ];

            if (playlist.length === 0) {
                const option = document.createElement('option');
                option.textContent = "No hay canciones en la lista";
                option.disabled = true;
                songSelect.appendChild(option);
                togglePlayPauseButton.disabled = true;
                prevSongButton.disabled = true;
                nextSongButton.disabled = true;
                return;
            } else {
                togglePlayPauseButton.disabled = false;
                prevSongButton.disabled = false;
                nextSongButton.disabled = false;
            }

            playlist.forEach((songItem, index) => {
                const option = document.createElement('option');
                let songName;
                if (typeof songItem === 'string') {
                    songName = songItem.split('/').pop().replace('.mp3', '');
                } else if (songItem && typeof songItem === 'object' && songItem.kind === 'file' && songItem.name) {
                    songName = songItem.name.replace('.mp3', '');
                } else {
                    songName = `Canción #${index + 1}`;
                }
                option.value = index;
                option.textContent = songName;
                songSelect.appendChild(option);
            });
            songSelect.value = currentSongIndex;
        };

        const loadSettings = async () => {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage({ action: 'loadSettings' }, async (result) => {
                    audioPlayer.volume = result.volume !== undefined ? result.volume : defaultSettings.volume;
                    volumeSliderInline.value = audioPlayer.volume;
                    currentBarColor = result.barColor || defaultSettings.barColor;
                    barColorSelect.value = currentBarColor;
                    currentWaveLineColor = result.waveLineColor || defaultSettings.waveLineColor;
                    waveLineColorSelect.value = currentWaveLineColor;
                    currentPokerChipColor = result.pokerChipColor || defaultSettings.pokerChipColor;
                    pokerChipColorSelect.value = currentPokerChipColor;
                    currentIntensity = parseFloat(result.intensity) !== undefined ? parseFloat(result.intensity) : defaultSettings.intensity;
                    intensitySlider.value = currentIntensity;
                    currentBarIntensity = parseFloat(result.barIntensity) !== undefined ? parseFloat(result.barIntensity) : defaultSettings.barIntensity;
                    barIntensitySlider.value = currentBarIntensity;
                    currentWaveIntensity = parseFloat(result.waveIntensity) !== undefined ? parseFloat(result.waveIntensity) : defaultSettings.waveIntensity;
                    waveIntensitySlider.value = currentWaveIntensity;
                    currentTriangleSize = parseFloat(result.triangleSize) !== undefined ? parseFloat(result.triangleSize) : defaultSettings.triangleSize;
                    triangleSizeSlider.value = currentTriangleSize;
                    currentInnerTriangleColor = result.innerTriangleColor || defaultSettings.innerTriangleColor;
                    innerTriangleColorSelect.value = currentInnerTriangleColor;
                    currentOuterTriangleColor = result.outerTriangleColor || defaultSettings.outerTriangleColor;
                    outerTriangleColorSelect.value = currentOuterTriangleColor;
                    if (result.visualizerType) {
                        currentVisualizerTypes = Array.isArray(result.visualizerType) ? result.visualizerType : [result.visualizerType];
                    } else {
                        currentVisualizerTypes = defaultSettings.visualizerType;
                    }
                    Array.from(visualizerTypeSelect.options).forEach(option => {
                        option.selected = currentVisualizerTypes.includes(option.value);
                    });

                    // NO SE CARGAN HANDLES PERSISTENTES AQUÍ.
                    // Los handles de archivos locales no pueden ser persistidos entre sesiones en Mv3 de esta forma.

                    currentSongIndex = result.currentSongIndex !== undefined ? result.currentSongIndex : defaultSettings.currentSongIndex;

                    populateSongSelect(); // Llama sin pasar handles restaurados

                    if (currentSongIndex >= playlist.length || playlist.length === 0) {
                        currentSongIndex = 0;
                    }

                    if (playlist.length > 0) {
                        const songToLoad = playlist[currentSongIndex];
                        const initialSongSource = await getSongSource(songToLoad);
                        if (initialSongSource) {
                            audioPlayer.src = initialSongSource;
                            audioPlayer.load();
                            togglePlayPauseButton.textContent = 'Reproducir';
                            isPlaying = false;
                        } else {
                            audioPlayer.src = '';
                            console.warn("No se pudo cargar la canción inicial. Por favor, agregue archivos locales o verifique los predeterminados.");
                            togglePlayPauseButton.textContent = 'Reproducir';
                            isPlaying = false;
                        }
                    } else {
                         audioPlayer.src = '';
                         togglePlayPauseButton.textContent = 'Reproducir';
                         isPlaying = false;
                    }
                    draw(); // Llama a draw después de cargar las configuraciones
                });
            } else {
                console.warn("chrome.runtime.sendMessage no está disponible. La configuración no se cargará de forma persistente.");
                applySettings(defaultSettings);
                populateSongSelect();
                draw();
            }
        };

        const applySettings = (settings) => {
            audioPlayer.volume = settings.volume;
            volumeSliderInline.value = settings.volume;
            saveSetting('volume', settings.volume);
            currentBarColor = settings.barColor;
            barColorSelect.value = currentBarColor;
            saveSetting('barColor', currentBarColor);
            currentWaveLineColor = settings.waveLineColor;
            waveLineColorSelect.value = currentWaveLineColor;
            saveSetting('waveLineColor', currentWaveLineColor);
            currentPokerChipColor = settings.pokerChipColor;
            pokerChipColorSelect.value = currentPokerChipColor;
            saveSetting('pokerChipColor', currentPokerChipColor);
            currentIntensity = settings.intensity;
            intensitySlider.value = currentIntensity;
            saveSetting('intensity', currentIntensity);
            currentBarIntensity = settings.barIntensity;
            barIntensitySlider.value = currentBarIntensity;
            saveSetting('barIntensity', currentBarIntensity);
            currentWaveIntensity = settings.waveIntensity;
            waveIntensitySlider.value = currentWaveIntensity;
            saveSetting('waveIntensity', currentWaveIntensity);
            currentTriangleSize = settings.triangleSize;
            triangleSizeSlider.value = currentTriangleSize;
            saveSetting('triangleSize', currentTriangleSize);
            currentInnerTriangleColor = settings.innerTriangleColor;
            innerTriangleColorSelect.value = currentInnerTriangleColor;
            saveSetting('innerTriangleColor', currentInnerTriangleColor);
            currentOuterTriangleColor = settings.outerTriangleColor;
            outerTriangleColorSelect.value = currentOuterTriangleColor;
            saveSetting('outerTriangleColor', currentOuterTriangleColor);
            currentVisualizerTypes = settings.visualizerType;
            Array.from(visualizerTypeSelect.options).forEach(option => {
                option.selected = settings.visualizerType.includes(option.value);
            });
            saveSetting('visualizerType', currentVisualizerTypes);

            // Ya no hay persistencia de handles, así que no se necesita savePlaylistHandles
            // Limpia la playlist actual si estás "reseteando"
            populateSongSelect([]); // Reinicia la playlist solo con las canciones por defecto

            currentSongIndex = 0;
            if (defaultSettings.defaultPlaylistUrls.length > 0) {
                audioPlayer.src = defaultSettings.defaultPlaylistUrls[currentSongIndex];
                audioPlayer.load();
            } else {
                audioPlayer.src = '';
            }
            saveSetting('currentSongIndex', currentSongIndex);

            // populateSongSelect ya se llamó
            draw();
            audioPlayer.pause();
            isPlaying = false;
            togglePlayPauseButton.textContent = 'Reproducir';
        };

        const resetSettings = () => {
            applySettings(defaultSettings);
            console.log("Todas las configuraciones se han restablecido a sus valores por defecto.");
        };

        const initAudio = () => {
            if (!audioContext) {
                audioContext = new(window.AudioContext || window.webkitAudioContext)();
                analyser = audioContext.createAnalyser();
                source = audioContext.createMediaElementSource(audioPlayer);
                source.connect(analyser);
                analyser.connect(audioContext.destination);
                analyser.fftSize = 256;
                analyser.minDecibels = -90;
                analyser.maxDecibels = -10;
                analyser.smoothingTimeConstant = 0.85;
                dataArray = new Uint8Array(analyser.frequencyBinCount); // Inicializa dataArray aquí
            }
        };

        const getSongSource = async (songItem) => {
            if (typeof songItem === 'string') {
                return songItem;
            } else if (songItem && typeof songItem === 'object' && songItem.kind === 'file' && songItem.getFile) {
                try {
                    const permissionStatus = await songItem.queryPermission({ mode: 'read' });
                    if (permissionStatus === 'denied') {
                        alert(`El permiso para leer el archivo "${songItem.name}" ha sido denegado. No se puede reproducir.`);
                        return null;
                    }
                    if (permissionStatus === 'prompt') {
                        const newPermissionStatus = await songItem.requestPermission({ mode: 'read' });
                        if (newPermissionStatus !== 'granted') {
                            alert(`Se requiere su permiso para reproducir "${songItem.name}". Permiso denegado.`);
                            return null;
                        }
                    }
                    const file = await songItem.getFile();
                    return URL.createObjectURL(file);
                } catch (error) {
                    console.error("Error al obtener el archivo del handle:", error);
                    alert(`Error al acceder al archivo "${songItem.name}". Puede que el archivo ya no exista o los permisos sean insuficientes.`);
                    return null;
                }
            } else {
                console.error("Tipo de canción no soportado en la playlist:", songItem);
                return null;
            }
        };

        const playCurrentOrNextSong = async () => {
            if (playlist.length === 0) {
                console.warn("No hay canciones en la lista de reproducción.");
                return;
            }
            initAudio();

            if (audioPlayer.paused) {
                const currentSongItem = playlist[currentSongIndex];
                const songSource = await getSongSource(currentSongItem);

                if (!songSource) {
                    console.warn("No se pudo obtener la fuente de la canción actual. No se puede reproducir.");
                    togglePlayPauseButton.textContent = 'Reproducir';
                    isPlaying = false;
                    return;
                }

                if (audioPlayer.src !== songSource) {
                    if (audioPlayer.src && audioPlayer.src.startsWith('blob:')) {
                        URL.revokeObjectURL(audioPlayer.src);
                    }
                    audioPlayer.src = songSource;
                    audioPlayer.load();
                }

                audioPlayer.play()
                    .then(() => {
                        isPlaying = true;
                        togglePlayPauseButton.textContent = 'En Pausa';
                        saveSetting('currentSongIndex', currentSongIndex);
                        draw();
                    })
                    .catch(error => {
                        console.error("Error al reproducir audio:", error);
                        togglePlayPauseButton.textContent = 'Reproducir';
                        isPlaying = false;
                        if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
                             alert("Se necesita interacción del usuario para reproducir audio. Haz clic en el botón de reproducción.");
                        }
                    });
            } else {
                audioPlayer.pause();
                isPlaying = false;
                togglePlayPauseButton.textContent = 'Reproducir';
            }
        };

        const playSpecificSong = async (index) => {
            if (index < 0 || index >= playlist.length) {
                console.error(`Índice de canción inválido: ${index}`);
                return;
            }
            initAudio();
            const newSongItem = playlist[index];
            const newSongSource = await getSongSource(newSongItem);

            if (!newSongSource) {
                console.warn("No se pudo obtener la fuente de la canción específica. No se reproduce.");
                togglePlayPauseButton.textContent = 'Reproducir';
                isPlaying = false;
                return;
            }

            if (audioPlayer.src && audioPlayer.src.startsWith('blob:')) {
                URL.revokeObjectURL(audioPlayer.src);
            }

            audioPlayer.src = newSongSource;
            audioPlayer.load();

            audioPlayer.play()
                .then(() => {
                    isPlaying = true;
                    currentSongIndex = index;
                    togglePlayPauseButton.textContent = 'En Pausa';
                    saveSetting('currentSongIndex', currentSongIndex);
                    songSelect.value = currentSongIndex;
                    draw();
                })
                .catch(error => {
                    console.error("Error al reproducir canción específica:", error);
                    togglePlayPauseButton.textContent = 'Reproducir';
                    isPlaying = false;
                     if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
                             alert("Se necesita interacción del usuario para reproducir audio. Haz clic en el botón de reproducción.");
                        }
                });
        };

        const playNextSong = () => {
            if (playlist.length === 0) return;
            if (playlist.length === 1 && audioPlayer.ended) {
                audioPlayer.currentTime = 0;
                isPlaying = false;
                togglePlayPauseButton.textContent = 'Reproducir';
                return;
            }
            currentSongIndex = (currentSongIndex + 1) % playlist.length;
            playSpecificSong(currentSongIndex);
        };

        const playPreviousSong = () => {
            if (playlist.length === 0) return;
            currentSongIndex = (currentSongIndex - 1 + playlist.length) % playlist.length;
            playSpecificSong(currentSongIndex);
        };

        const getTriangleColor = (colorName, alpha) => {
            switch (colorName) {
                case 'red': return `rgba(255, 0, 0, ${alpha})`;
                case 'green': return `rgba(0, 255, 0, ${alpha})`;
                case 'blue': return `rgba(0, 0, 255, ${alpha})`;
                case 'yellow': return `rgba(255, 255, 0, ${alpha})`;
                case 'purple': return `rgba(128, 0, 128, ${alpha})`;
                case 'cyan': return `rgba(0, 255, 255, ${alpha})`;
                case 'magenta': return `rgba(255, 0, 255, ${alpha})`;
                case 'white': return `rgba(255, 255, 255, ${alpha})`;
                case 'black': return `rgba(0, 0, 0, ${alpha})`;
                case 'orange': return `rgba(255, 165, 0, ${alpha})`;
                case 'light-blue': return `rgba(173, 216, 230, ${alpha})`;
                case 'lime': return `rgba(0, 255, 0, ${alpha})`;
                case 'gold': return `rgba(255, 215, 0, ${alpha})`;
                case 'silver': return `rgba(192, 192, 192, ${alpha})`;
                case 'teal': return `rgba(0, 128, 128, ${alpha})`;
                case 'indigo': return `rgba(75, 0, 130, ${alpha})`;
                case 'maroon': return `rgba(128, 0, 0, ${alpha})`;
                case 'olive': return `rgba(128, 128, 0, ${alpha})`;
                case 'navy': return `rgba(0, 0, 128, ${alpha})`;
                case 'pink': return `rgba(255, 192, 203, ${alpha})`;
                case 'brown': return `rgba(165, 42, 42, ${alpha})`;
                case 'grey': return `rgba(128, 128, 128, ${alpha})`;
                default: return `rgba(0, 0, 255, ${alpha})`;
            }
        };

        const formatTime = (seconds) => {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = Math.floor(seconds % 60);
            return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
        };

        const pokerChips = []; // Declaración de pokerChips
        const MAX_POKER_CHIPS = 5; // Declaración de MAX_POKER_CHIPS

        function createPokerChip(value, canvasWidth, canvasHeight) {
            const baseRadius = 30;
            const initialX = Math.random() * (canvasWidth - baseRadius * 4) + baseRadius * 2;
            const initialY = canvasHeight - baseRadius;
            const vx = (Math.random() - 0.5) * 5;
            const vy = -(5 + Math.random() * 10);
            const colorTypes = ['blue', 'red', 'yellow', 'green', 'purple', 'cyan', 'magenta', 'orange'];
            const randomColorType = colorTypes[Math.floor(Math.random() * colorTypes.length)];
            return {
                x: initialX,
                y: initialY,
                vx: vx,
                vy: vy,
                baseRadius: baseRadius,
                value: value,
                colorType: randomColorType
            };
        }

        addSongsButton.addEventListener('click', async () => {
            try {
                const handles = await window.showOpenFilePicker({
                    multiple: true,
                    types: [{
                        description: 'Audio Files',
                        accept: {
                            'audio/*': ['.mp3', '.wav', '.ogg', '.aac']
                        }
                    }]
                });

                let newSongsAdded = false;
                let currentSessionHandles = []; // Almacena handles para la sesión actual
                for (const handle of handles) {
                    const permissionStatus = await handle.requestPermission({ mode: 'read' });
                    if (permissionStatus === 'granted') {
                        currentSessionHandles.push({ name: handle.name, handle: handle });
                        newSongsAdded = true;
                    } else {
                        console.warn(`Permiso denegado para el archivo: ${handle.name}`);
                    }
                }

                if (newSongsAdded) {
                    // Actualiza la playlist con las canciones por defecto Y las añadidas en esta sesión
                    populateSongSelect(currentSessionHandles);
                    alert("Canciones añadidas a la lista de reproducción. Tenga en cuenta que las canciones locales no se guardarán entre sesiones del navegador.");
                    togglePlayPauseButton.textContent = 'Reproducir';
                    isPlaying = false;
                } else {
                    alert("No se añadieron nuevas canciones o se denegaron los permisos.");
                }

            } catch (error) {
                console.log("Error al seleccionar archivos con File System Access API:", error);
                if (error.name === 'AbortError') {
                    console.log("Selección de archivo cancelada por el usuario.");
                } else {
                    alert("Hubo un error al intentar añadir canciones. Asegúrate de dar los permisos necesarios.");
                }
            }
        });

        openControlsButton.addEventListener('click', () => {
            controlsPanel.classList.add('open');
        });
        closeControlsButton.addEventListener('click', () => {
            controlsPanel.classList.remove('open');
        });
        window.addEventListener('click', (event) => {
            if (controlsPanel.classList.contains('open') &&
                !controlsPanel.contains(event.target) &&
                !openControlsButton.contains(event.target)) {
                controlsPanel.classList.remove('open');
            }
        });

        togglePlayPauseButton.addEventListener('click', playCurrentOrNextSong);
        prevSongButton.addEventListener('click', playPreviousSong);
        nextSongButton.addEventListener('click', playNextSong);

        volumeSliderInline.addEventListener('input', () => {
            audioPlayer.volume = volumeSliderInline.value;
            saveSetting('volume', volumeSliderInline.value);
        });

        audioPlayer.addEventListener('ended', playNextSong);

        songSelect.addEventListener('change', async (event) => {
            const newIndex = parseInt(event.target.value, 10);
            if (newIndex !== currentSongIndex) {
                currentSongIndex = newIndex;
                saveSetting('currentSongIndex', currentSongIndex);

                const songToLoad = playlist[currentSongIndex];
                const newSongSource = await getSongSource(songToLoad);

                if (newSongSource) {
                    if (audioPlayer.src && audioPlayer.src.startsWith('blob:')) {
                        URL.revokeObjectURL(audioPlayer.src);
                    }
                    audioPlayer.src = newSongSource;
                    audioPlayer.load();

                    if (isPlaying) {
                        audioPlayer.play()
                            .catch(error => {
                                console.error("Error al reproducir tras cambiar de canción:", error);
                                togglePlayPauseButton.textContent = 'Reproducir';
                                isPlaying = false;
                                if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
                                     alert("Se necesita interacción del usuario para reproducir audio. Haz clic en el botón de reproducción.");
                                }
                            });
                    } else {
                         togglePlayPauseButton.textContent = 'Reproducir';
                    }
                } else {
                    audioPlayer.src = '';
                    console.warn("No se pudo cargar la canción seleccionada.");
                    togglePlayPauseButton.textContent = 'Reproducir';
                    isPlaying = false;
                }
            }
        });

        audioPlayer.addEventListener('timeupdate', () => {
            songProgressBar.value = audioPlayer.currentTime;
            currentTimeSpan.textContent = formatTime(audioPlayer.currentTime);
        });

        audioPlayer.addEventListener('loadedmetadata', () => {
            songProgressBar.max = audioPlayer.duration;
            totalTimeSpan.textContent = formatTime(audioPlayer.duration);
            currentTimeSpan.textContent = formatTime(audioPlayer.currentTime);
        });

        songProgressBar.addEventListener('input', () => {
            audioPlayer.currentTime = songProgressBar.value;
        });

        barColorSelect.addEventListener('change', () => {
            currentBarColor = barColorSelect.value;
            saveSetting('barColor', currentBarColor);
            draw();
        });

        waveLineColorSelect.addEventListener('change', () => {
            currentWaveLineColor = waveLineColorSelect.value;
            saveSetting('waveLineColor', currentWaveLineColor);
            draw();
        });

        pokerChipColorSelect.addEventListener('change', () => {
            currentPokerChipColor = pokerChipColorSelect.value;
            saveSetting('pokerChipColor', currentPokerChipColor);
            draw();
        });

        intensitySlider.addEventListener('input', () => {
            currentIntensity = parseFloat(intensitySlider.value);
            saveSetting('intensity', currentIntensity);
            draw();
        });

        barIntensitySlider.addEventListener('input', () => {
            currentBarIntensity = parseFloat(barIntensitySlider.value);
            saveSetting('barIntensity', currentBarIntensity);
            draw();
        });

        waveIntensitySlider.addEventListener('input', () => {
            currentWaveIntensity = parseFloat(waveIntensitySlider.value);
            saveSetting('waveIntensity', currentWaveIntensity);
            draw();
        });

        triangleSizeSlider.addEventListener('input', () => {
            currentTriangleSize = parseFloat(triangleSizeSlider.value);
            saveSetting('triangleSize', currentTriangleSize);
            draw();
        });

        innerTriangleColorSelect.addEventListener('change', () => {
            currentInnerTriangleColor = innerTriangleColorSelect.value;
            saveSetting('innerTriangleColor', currentInnerTriangleColor);
            draw();
        });

        outerTriangleColorSelect.addEventListener('change', () => {
            currentOuterTriangleColor = outerTriangleColorSelect.value;
            saveSetting('outerTriangleColor', currentOuterTriangleColor);
            draw();
        });

        visualizerTypeSelect.addEventListener('change', () => {
            currentVisualizerTypes = Array.from(visualizerTypeSelect.selectedOptions).map(option => option.value);
            if (currentVisualizerTypes.includes('all')) {
                currentVisualizerTypes = ['all'];
                Array.from(visualizerTypeSelect.options).forEach(option => {
                    option.selected = (option.value === 'all');
                });
            }
            saveSetting('visualizerType', currentVisualizerTypes);
            draw();
        });

        resetDefaultsButton.addEventListener('click', () => {
            resetSettings();
        });

        loadSettings(); // Cargar settings al inicio
    } else {
        console.log("No estás en la página de inicio de la extensión.");
    }
});

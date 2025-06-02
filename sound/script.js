document.addEventListener('DOMContentLoaded', () => { 
    const currentBrowserUrl = window.location.href;
    const extensionNewTabPageUrl = chrome.runtime.getURL("sound/index.html");

    if (currentBrowserUrl === extensionNewTabPageUrl) { 
        const audioPlayerElement = document.getElementById('audioPlayer');
        const audioSpectrumCanvas = document.getElementById('audioSpectrumCanvas');
        const canvasContext = audioSpectrumCanvas.getContext('2d');
 
        const visualizerControlsPanel = document.getElementById('controlsPanel');
        const openControlsButton = document.getElementById('openControlsButton');
        const closeControlsButton = document.getElementById('closeControlsButton');
 
        const togglePlayPauseButton = document.getElementById('togglePlayPauseButton');
        const prevSongButton = document.getElementById('prevSongButton');
        const nextSongButton = document.getElementById('nextSongButton');
        const volumeSliderInput = document.getElementById('volumeSliderInline');
        const songSelectionDropdown = document.getElementById('songSelect');
        const songProgressBar = document.getElementById('songProgressBar');
        const currentTimeDisplay = document.getElementById('currentTime');
        const totalTimeDisplay = document.getElementById('totalTime');
 
        const barColorSelect = document.getElementById('barColorSelect');
        const waveLineColorSelect = document.getElementById('waveLineColorSelect');
        const visualizerTypeSelect = document.getElementById('visualizerTypeSelect');
        const barIntensitySlider = document.getElementById('barIntensitySlider');
        const waveIntensitySlider = document.getElementById('waveIntensitySlider');
        const triangleSizeSlider = document.getElementById('triangleSizeSlider');
        const innerTriangleColorSelect = document.getElementById('innerTriangleColorSelect');
        const outerTriangleColorSelect = document.getElementById('outerTriangleColorSelect');
        const resetDefaultsButton = document.getElementById('resetDefaultsButton');
        const addSongsButton = document.getElementById('addSongsButton');
 
        let audioContextInstance;
        let audioAnalyserNode;
        let audioSourceNode;
        let isAudioPlaying = false;
        let frequencyDataArray;  
        let currentPlaylist = [];
        let visualizerParticles = [];
        let waveVisualizerOffset = 0;
        let isTriangleFragmented = false;  
        let isBeatDetected = false;
        let lastBeatDetectionTime = 0;
 
        const BEAT_DETECTION_THRESHOLD = 200;
        const BEAT_DECAY_DURATION = 200;  
 
        const defaultVisualizerSettings = {
            volume: 0.5,
            barColor: 'dynamic',
            waveLineColor: 'dynamic',
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
 
        let currentBarColor = defaultVisualizerSettings.barColor;
        let currentWaveLineColor = defaultVisualizerSettings.waveLineColor;
        let currentOverallIntensity = defaultVisualizerSettings.intensity;  
        let currentBarIntensity = defaultVisualizerSettings.barIntensity;
        let currentWaveIntensity = defaultVisualizerSettings.waveIntensity;
        let currentTriangleSize = defaultVisualizerSettings.triangleSize;
        let currentInnerTriangleColor = defaultVisualizerSettings.innerTriangleColor;
        let currentOuterTriangleColor = defaultVisualizerSettings.outerTriangleColor;
        let activeVisualizerTypes = defaultVisualizerSettings.visualizerType;  
        let currentSongPlayingIndex = defaultVisualizerSettings.currentSongIndex;  
 
        const PARTICLE_ASCENT_SPEED = -3;
 
        const setCanvasDimensions = () => {
            audioSpectrumCanvas.width = window.innerWidth;
            audioSpectrumCanvas.height = window.innerHeight;
        };

        setCanvasDimensions();
        window.addEventListener('resize', setCanvasDimensions);

        const detectAudioBeat = (data) => {
            const sum = data.reduce((a, b) => a + b, 0);
            const avg = sum / data.length;

            if (audioAnalyserNode && audioAnalyserNode.previousAvgFrequency) {
                if (avg > audioAnalyserNode.previousAvgFrequency * 0.3 && (Date.now() - lastBeatDetectionTime) > BEAT_DECAY_DURATION) {
                    isBeatDetected = true;
                    lastBeatDetectionTime = Date.now();
                } else {
                    isBeatDetected = false;
                }
            }
            audioAnalyserNode.previousAvgFrequency = avg;
        };

        class VisualizerParticle {
            constructor(x, y, color, baseSpeedY = PARTICLE_ASCENT_SPEED) {
                this.x = x;
                this.y = y;
                this.size = Math.random() * 3 + 1;
                this.speedY = baseSpeedY + (Math.random() * -1);
                this.alpha = 1;
                this.color = color;
            }

            update() {
                this.y += this.speedY;
                this.alpha -= 0.02;
                this.size *= 0.98;
            }

            draw(ctx) {
                ctx.save();
                ctx.globalAlpha = this.alpha;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        const drawAudioVisualization = () => {
            if (!isAudioPlaying && (!audioAnalyserNode || !audioContextInstance)) {
                canvasContext.clearRect(0, 0, audioSpectrumCanvas.width, audioSpectrumCanvas.height);
                return;
            }

            if (isAudioPlaying && !audioAnalyserNode) {
                initializeAudioContext();
                if (!audioAnalyserNode) {
                    requestAnimationFrame(drawAudioVisualization);
                    return;
                }
            }

            canvasContext.clearRect(0, 0, audioSpectrumCanvas.width, audioSpectrumCanvas.height);
            const canvasTotalHeight = audioSpectrumCanvas.height;
            const canvasTotalWidth = audioSpectrumCanvas.width;

            if (audioAnalyserNode && isAudioPlaying) {
                audioAnalyserNode.getByteFrequencyData(frequencyDataArray);
                detectAudioBeat(frequencyDataArray);
            } else {
                frequencyDataArray = frequencyDataArray || new Uint8Array(audioAnalyserNode ? audioAnalyserNode.frequencyBinCount : 0);
                frequencyDataArray.fill(0);
            }

            const drawAllVisualizers = activeVisualizerTypes.includes('all');
            const drawBarVisualizer = drawAllVisualizers || activeVisualizerTypes.includes('bars');
            const drawWavyVisualizer = drawAllVisualizers || activeVisualizerTypes.includes('wavy');
            const drawTriangleVisualizer = drawAllVisualizers || activeVisualizerTypes.includes('triangles');

            let beatScaleEffect = 1;
            if (isBeatDetected) {
                beatScaleEffect = 1.05;
            }

            canvasContext.save();
            canvasContext.scale(beatScaleEffect, beatScaleEffect);
            canvasContext.translate(audioSpectrumCanvas.width * (1 - beatScaleEffect) / 2, audioSpectrumCanvas.height * (1 - beatScaleEffect) / 2);

            if (drawBarVisualizer) {
                const barWidth = (audioSpectrumCanvas.width / frequencyDataArray.length) * 2.5;
                let xPositionBar = 0;
                for (let i = 0; i < frequencyDataArray.length; i++) {
                    const barHeight = frequencyDataArray[i] * 0.5 * currentOverallIntensity * currentBarIntensity;
                    const intensity = frequencyDataArray[i] / 255;
                    let hue;
                    switch (currentBarColor) {
                        case 'blue':
                            hue = 200;
                            break;
                        case 'green':
                            hue = 120;
                            break;
                        case 'red':
                            hue = 0;
                            break;
                        case 'purple':
                            hue = 270;
                            break;
                        case 'orange':
                            hue = 30;
                            break;
                        case 'cyan':
                            hue = 180;
                            break;
                        case 'magenta':
                            hue = 300;
                            break;
                        case 'yellow':
                            hue = 60;
                            break;
                        case 'dynamic':
                        default:
                            if (intensity < 0.70) {
                                hue = 200;
                            } else if (intensity < 0.75) {
                                hue = 60;
                            } else {
                                hue = 0;
                            }
                            break;
                    }
                    const saturation = 70 + (intensity * 30);
                    const lightness = 30 + (intensity * 40);
                    canvasContext.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
                    canvasContext.fillRect(xPositionBar, canvasTotalHeight - barHeight, barWidth, barHeight);

                    if (i % 5 === 0 && barHeight > 10) {
                        const reflectiveHeight = barHeight * 0.1;
                        canvasContext.fillStyle = `rgba(255, 255, 255, ${intensity * 0.3})`;
                        canvasContext.fillRect(xPositionBar, canvasTotalHeight - barHeight - reflectiveHeight, barWidth, reflectiveHeight);
                    }

                    if (barHeight > canvasTotalHeight * 0.1 && Math.random() < 0.05) {
                        visualizerParticles.push(new VisualizerParticle(xPositionBar + barWidth / 2, canvasTotalHeight - barHeight, `hsl(${hue}, ${saturation}%, ${lightness + 20}%)`, PARTICLE_ASCENT_SPEED));
                    }
                    xPositionBar += barWidth + 0.1;
                }

                for (let i = visualizerParticles.length - 1; i >= 0; i--) {
                    visualizerParticles[i].update();
                    if (visualizerParticles[i].alpha <= 0 || visualizerParticles[i].size <= 0.5) {
                        visualizerParticles.splice(i, 1);
                    } else {
                        visualizerParticles[i].draw(canvasContext);
                    }
                }
            }

            if (drawTriangleVisualizer && frequencyDataArray[10] > 10) {
                if (isNaN(currentTriangleSize) || !isFinite(currentTriangleSize)) {
                    resetVisualizerSettings();
                }

                const overallIntensity = frequencyDataArray.reduce((acc, val) => acc + val, 0) / frequencyDataArray.length / 255;
                let size = (200 + (overallIntensity * 300 * currentOverallIntensity)) * currentTriangleSize;
                const alpha = 0.1 + (overallIntensity * 0.2);
                const centerX = audioSpectrumCanvas.width / 2;
                const centerY = audioSpectrumCanvas.height / 2;

                const outerTriangleFillColor = getTriangleColorValue(currentOuterTriangleColor, alpha);
                const innerTriangleFillColor = getTriangleColorValue(currentInnerTriangleColor, alpha * 1.5);

                if (isBeatDetected && overallIntensity > 0.8 && !isTriangleFragmented) {
                    isTriangleFragmented = true;
                } else if (!isBeatDetected) {
                    isTriangleFragmented = false;
                }

                if (isTriangleFragmented) {
                    const numFragments = 1;
                    for (let i = 0; i < numFragments; i++) {
                        const fragmentSize = size * (0.2 + Math.random() * 0.3);
                        const offsetX = (Math.random() - 0.5) * size * 0.5;
                        const offsetY = (Math.random() - 0.5) * size * 0.5;
                        const fragmentAlpha = Math.random() * 0.5 + 0.5;

                        canvasContext.save();
                        canvasContext.translate(centerX + offsetX, centerY + offsetY);
                        canvasContext.rotate(Math.PI + Math.random() * Math.PI * 2);
                        canvasContext.beginPath();
                        canvasContext.moveTo(0, -fragmentSize / 2);
                        canvasContext.lineTo(fragmentSize / 2 * Math.sqrt(3) / 2, fragmentSize / 2 / 2);
                        canvasContext.lineTo(-fragmentSize / 2 * Math.sqrt(3) / 2, fragmentSize / 2 / 2);
                        canvasContext.closePath();
                        canvasContext.fillStyle = getTriangleColorValue(currentOuterTriangleColor, fragmentAlpha);
                        canvasContext.fill();
                        canvasContext.restore();
                    }
                } else {
                    canvasContext.save();
                    canvasContext.translate(centerX, centerY);
                    canvasContext.rotate(Math.PI);
                    canvasContext.beginPath();
                    canvasContext.moveTo(0, -size / 2);
                    canvasContext.lineTo(size / 2 * Math.sqrt(3) / 2, size / 2 / 2);
                    canvasContext.lineTo(-size / 2 * Math.sqrt(3) / 2, size / 2 / 2);
                    canvasContext.closePath();
                    canvasContext.fillStyle = outerTriangleFillColor;
                    canvasContext.fill();

                    const innerSize = size * 0.5;
                    canvasContext.beginPath();
                    canvasContext.moveTo(0, -innerSize / 2);
                    canvasContext.lineTo(innerSize / 2 * Math.sqrt(3) / 2, innerSize / 2 / 2);
                    canvasContext.lineTo(-innerSize / 2 * Math.sqrt(3) / 2, innerSize / 2 / 2);
                    canvasContext.closePath();
                    canvasContext.fillStyle = innerTriangleFillColor;
                    canvasContext.fill();
                    canvasContext.restore();
                }
            }

            if (drawWavyVisualizer) {
                let waveHueColor;
                let waveStrokeStyle;
                switch (currentWaveLineColor) {
                    case 'white':
                        waveStrokeStyle = 'rgba(255, 255, 255, 0.7)';
                        break;
                    case 'orange':
                        waveHueColor = 30;
                        waveStrokeStyle = `hsl(${waveHueColor}, 100%, 50%, 0.7)`;
                        break;
                    case 'pink':
                        waveHueColor = 330;
                        waveStrokeStyle = `hsl(${waveHueColor}, 100%, 50%, 0.7)`;
                        break;
                    case 'red':
                        waveHueColor = 0;
                        waveStrokeStyle = `hsl(${waveHueColor}, 100%, 50%, 0.7)`;
                        break;
                    case 'green':
                        waveHueColor = 120;
                        waveStrokeStyle = `hsl(${waveHueColor}, 100%, 50%, 0.7)`;
                        break;
                    case 'blue':
                        waveHueColor = 240;
                        waveStrokeStyle = `hsl(${waveHueColor}, 100%, 50%, 0.7)`;
                        break;
                    case 'yellow':
                        waveHueColor = 60;
                        waveStrokeStyle = `hsl(${waveHueColor}, 100%, 50%, 0.7)`;
                        break;
                    case 'purple':
                        waveHueColor = 270;
                        waveStrokeStyle = `hsl(${waveHueColor}, 100%, 50%, 0.7)`;
                        break;
                    case 'cyan':
                        waveHueColor = 180;
                        waveStrokeStyle = `hsl(${waveHueColor}, 100%, 50%, 0.7)`;
                        break;
                    case 'magenta':
                        waveHueColor = 300;
                        waveStrokeStyle = `hsl(${waveHueColor}, 100%, 50%, 0.7)`;
                        break;
                    case 'dynamic':
                    default:
                        const averageFrequency = frequencyDataArray.reduce((acc, val) => acc + val, 0) / frequencyDataArray.length;
                        waveHueColor = 200 + (averageFrequency / 255) * 50;
                        waveStrokeStyle = `hsl(${waveHueColor}, 70%, 60%, 0.7)`;
                        break;
                }
                canvasContext.lineWidth = 4 * currentOverallIntensity * currentWaveIntensity;
                canvasContext.strokeStyle = waveStrokeStyle;
                canvasContext.beginPath();

                const flowSpeed = audioPlayerElement.playbackRate * 2;
                waveVisualizerOffset = (waveVisualizerOffset + flowSpeed) % (audioSpectrumCanvas.width * 2);

                const sliceWidth = audioSpectrumCanvas.width * 2.0 / frequencyDataArray.length;
                let lineX = -waveVisualizerOffset;

                for (let i = 0; i < frequencyDataArray.length; i++) {
                    const v = frequencyDataArray[i] / 128.0;
                    const y = (v * audioSpectrumCanvas.height / 1);
                    if (i === 0) {
                        canvasContext.moveTo(lineX, y);
                    } else {
                        canvasContext.lineTo(lineX, y);
                    }
                    lineX += sliceWidth;
                }
                canvasContext.lineTo(audioSpectrumCanvas.width, audioSpectrumCanvas.height / 2);
                canvasContext.stroke();
            }
            canvasContext.restore();

            if (isAudioPlaying) {
                requestAnimationFrame(drawAudioVisualization);
            }
        };

        const saveAppSetting = (key, value) => {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage({
                    action: 'saveSetting',
                    data: {
                        key: key,
                        value: value
                    }
                });
            } else {
                console.warn("chrome.runtime.sendMessage no está disponible. La configuración no se guardará de forma persistente.");
            }
        };

        const populateSongSelectionDropdown = (currentSessionHandles = []) => {
            songSelectionDropdown.innerHTML = '';
            currentPlaylist = [...defaultVisualizerSettings.defaultPlaylistUrls, ...currentSessionHandles.map(item => item.handle)];

            if (currentPlaylist.length === 0) {
                const option = document.createElement('option');
                option.textContent = "No hay canciones en la lista";
                option.disabled = true;
                songSelectionDropdown.appendChild(option);
                togglePlayPauseButton.disabled = true;
                prevSongButton.disabled = true;
                nextSongButton.disabled = true;
                return;
            } else {
                togglePlayPauseButton.disabled = false;
                prevSongButton.disabled = false;
                nextSongButton.disabled = false;
            }

            currentPlaylist.forEach((songItem, index) => {
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
                songSelectionDropdown.appendChild(option);
            });
            songSelectionDropdown.value = currentSongPlayingIndex;
        };

        const loadVisualizerSettings = async () => {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage({
                    action: 'loadSettings'
                }, async (result) => {
                    audioPlayerElement.volume = result.volume !== undefined ? result.volume : defaultVisualizerSettings.volume;
                    volumeSliderInput.value = audioPlayerElement.volume;

                    currentBarColor = result.barColor || defaultVisualizerSettings.barColor;
                    barColorSelect.value = currentBarColor;

                    currentWaveLineColor = result.waveLineColor || defaultVisualizerSettings.waveLineColor;
                    waveLineColorSelect.value = currentWaveLineColor;

                    currentBarIntensity = parseFloat(result.barIntensity) !== undefined ? parseFloat(result.barIntensity) : defaultVisualizerSettings.barIntensity;
                    barIntensitySlider.value = currentBarIntensity;

                    currentWaveIntensity = parseFloat(result.waveIntensity) !== undefined ? parseFloat(result.waveIntensity) : defaultVisualizerSettings.waveIntensity;
                    waveIntensitySlider.value = currentWaveIntensity;

                    currentTriangleSize = parseFloat(result.triangleSize) !== undefined ? parseFloat(result.triangleSize) : defaultVisualizerSettings.triangleSize;
                    triangleSizeSlider.value = currentTriangleSize;

                    currentInnerTriangleColor = result.innerTriangleColor || defaultVisualizerSettings.innerTriangleColor;
                    innerTriangleColorSelect.value = currentInnerTriangleColor;

                    currentOuterTriangleColor = result.outerTriangleColor || defaultVisualizerSettings.outerTriangleColor;
                    outerTriangleColorSelect.value = currentOuterTriangleColor;

                    if (result.visualizerType) {
                        activeVisualizerTypes = Array.isArray(result.visualizerType) ? result.visualizerType : [result.visualizerType];
                    } else {
                        activeVisualizerTypes = defaultVisualizerSettings.visualizerType;
                    }
                    Array.from(visualizerTypeSelect.options).forEach(option => {
                        option.selected = activeVisualizerTypes.includes(option.value);
                    });

                    currentSongPlayingIndex = result.currentSongIndex !== undefined ? result.currentSongIndex : defaultVisualizerSettings.currentSongIndex;

                    populateSongSelectionDropdown();

                    if (currentSongPlayingIndex >= currentPlaylist.length || currentPlaylist.length === 0) {
                        currentSongPlayingIndex = 0;
                    }

                    if (currentPlaylist.length > 0) {
                        const songToLoad = currentPlaylist[currentSongPlayingIndex];
                        const initialSongSource = await getSongFileSource(songToLoad);
                        if (initialSongSource) {
                            audioPlayerElement.src = initialSongSource;
                            audioPlayerElement.load();
                            togglePlayPauseButton.textContent = 'Reproducir';
                            isAudioPlaying = false;
                        } else {
                            audioPlayerElement.src = '';
                            console.warn("No se pudo cargar la canción inicial. Por favor, agregue archivos locales o verifique los predeterminados.");
                            togglePlayPauseButton.textContent = 'Reproducir';
                            isAudioPlaying = false;
                        }
                    } else {
                        audioPlayerElement.src = '';
                        togglePlayPauseButton.textContent = 'Reproducir';
                        isAudioPlaying = false;
                    }
                    drawAudioVisualization();
                });
            } else {
                console.warn("chrome.runtime.sendMessage no está disponible. La configuración no se cargará de forma persistente.");
                applyVisualizerSettings(defaultVisualizerSettings);
                populateSongSelectionDropdown();
                drawAudioVisualization();
            }
        };

        const applyVisualizerSettings = (settings) => {
            audioPlayerElement.volume = settings.volume;
            volumeSliderInput.value = settings.volume;
            saveAppSetting('volume', settings.volume);

            currentBarColor = settings.barColor;
            barColorSelect.value = currentBarColor;
            saveAppSetting('barColor', currentBarColor);

            currentWaveLineColor = settings.waveLineColor;
            waveLineColorSelect.value = currentWaveLineColor;
            saveAppSetting('waveLineColor', currentWaveLineColor);

            currentOverallIntensity = settings.intensity;  
            currentBarIntensity = settings.barIntensity;
            barIntensitySlider.value = currentBarIntensity;
            saveAppSetting('barIntensity', currentBarIntensity);

            currentWaveIntensity = settings.waveIntensity;
            waveIntensitySlider.value = currentWaveIntensity;
            saveAppSetting('waveIntensity', currentWaveIntensity);

            currentTriangleSize = settings.triangleSize;
            triangleSizeSlider.value = currentTriangleSize;
            saveAppSetting('triangleSize', currentTriangleSize);

            currentInnerTriangleColor = settings.innerTriangleColor;
            innerTriangleColorSelect.value = currentInnerTriangleColor;
            saveAppSetting('innerTriangleColor', currentInnerTriangleColor);

            currentOuterTriangleColor = settings.outerTriangleColor;
            outerTriangleColorSelect.value = currentOuterTriangleColor;
            saveAppSetting('outerTriangleColor', currentOuterTriangleColor);

            activeVisualizerTypes = settings.visualizerType;
            Array.from(visualizerTypeSelect.options).forEach(option => {
                option.selected = settings.visualizerType.includes(option.value);
            });
            saveAppSetting('visualizerType', activeVisualizerTypes);

            populateSongSelectionDropdown([]);  
            currentSongPlayingIndex = 0;

            if (defaultVisualizerSettings.defaultPlaylistUrls.length > 0) {
                audioPlayerElement.src = defaultVisualizerSettings.defaultPlaylistUrls[currentSongPlayingIndex];
                audioPlayerElement.load();
            } else {
                audioPlayerElement.src = '';
            }
            saveAppSetting('currentSongIndex', currentSongPlayingIndex);

            drawAudioVisualization();
            audioPlayerElement.pause();
            isAudioPlaying = false;
            togglePlayPauseButton.textContent = 'Reproducir';
        };

        const resetVisualizerSettings = () => {
            applyVisualizerSettings(defaultVisualizerSettings);
            console.log("Todas las configuraciones se han restablecido a sus valores por defecto.");
        };

        const initializeAudioContext = () => {
            if (!audioContextInstance) {
                audioContextInstance = new(window.AudioContext || window.webkitAudioContext)();
                audioAnalyserNode = audioContextInstance.createAnalyser();
                audioSourceNode = audioContextInstance.createMediaElementSource(audioPlayerElement);
                audioSourceNode.connect(audioAnalyserNode);
                audioAnalyserNode.connect(audioContextInstance.destination);
                audioAnalyserNode.fftSize = 256;
                audioAnalyserNode.minDecibels = -90;
                audioAnalyserNode.maxDecibels = -10;
                audioAnalyserNode.smoothingTimeConstant = 0.85;
                frequencyDataArray = new Uint8Array(audioAnalyserNode.frequencyBinCount);
            }
        };

        const getSongFileSource = async (songItem) => {
            if (typeof songItem === 'string') {
                return songItem;
            } else if (songItem && typeof songItem === 'object' && songItem.kind === 'file' && songItem.getFile) {
                try {
                    const permissionStatus = await songItem.queryPermission({
                        mode: 'read'
                    });
                    if (permissionStatus === 'denied') {
                        alert(`El permiso para leer el archivo "${songItem.name}" ha sido denegado. No se puede reproducir.`);
                        return null;
                    }
                    if (permissionStatus === 'prompt') {
                        const newPermissionStatus = await songItem.requestPermission({
                            mode: 'read'
                        });
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

        const togglePlayPauseAudio = async () => {
            if (currentPlaylist.length === 0) {
                console.warn("No hay canciones en la lista de reproducción.");
                return;
            }
            initializeAudioContext();
            if (audioPlayerElement.paused) {
                const currentSongItem = currentPlaylist[currentSongPlayingIndex];
                const songSource = await getSongFileSource(currentSongItem);
                if (!songSource) {
                    console.warn("No se pudo obtener la fuente de la canción actual. No se puede reproducir.");
                    togglePlayPauseButton.textContent = 'Reproducir';
                    isAudioPlaying = false;
                    return;
                }
                if (audioPlayerElement.src !== songSource) {
                    if (audioPlayerElement.src && audioPlayerElement.src.startsWith('blob:')) {
                        URL.revokeObjectURL(audioPlayerElement.src);
                    }
                    audioPlayerElement.src = songSource;
                    audioPlayerElement.load();
                }
                audioPlayerElement.play().then(() => {
                    isAudioPlaying = true;
                    togglePlayPauseButton.textContent = 'Pausar';
                    saveAppSetting('currentSongIndex', currentSongPlayingIndex);
                    drawAudioVisualization();
                }).catch(error => {
                    console.error("Error al reproducir audio:", error);
                    togglePlayPauseButton.textContent = 'Reproducir';
                    isAudioPlaying = false;
                    if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
                        alert("Se necesita interacción del usuario para reproducir audio. Haz clic en el botón de reproducción.");
                    }
                });
            } else {
                audioPlayerElement.pause();
                isAudioPlaying = false;
                togglePlayPauseButton.textContent = 'Reproducir';
            }
        };

        const playSpecificSongByIndex = async (index) => {
            if (index < 0 || index >= currentPlaylist.length) {
                console.error(`Índice de canción inválido: ${index}`);
                return;
            }
            initializeAudioContext();
            const newSongItem = currentPlaylist[index];
            const newSongSource = await getSongFileSource(newSongItem);

            if (!newSongSource) {
                console.warn("No se pudo obtener la fuente de la canción específica. No se reproduce.");
                togglePlayPauseButton.textContent = 'Reproducir';
                isAudioPlaying = false;
                return;
            }

            if (audioPlayerElement.src && audioPlayerElement.src.startsWith('blob:')) {
                URL.revokeObjectURL(audioPlayerElement.src);
            }
            audioPlayerElement.src = newSongSource;
            audioPlayerElement.load();

            audioPlayerElement.play().then(() => {
                isAudioPlaying = true;
                currentSongPlayingIndex = index;
                togglePlayPauseButton.textContent = 'En Pausa';
                saveAppSetting('currentSongIndex', currentSongPlayingIndex);
                songSelectionDropdown.value = currentSongPlayingIndex;
                drawAudioVisualization();
            }).catch(error => {
                console.error("Error al reproducir canción específica:", error);
                togglePlayPauseButton.textContent = 'Reproducir';
                isAudioPlaying = false;
                if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
                    alert("Se necesita interacción del usuario para reproducir audio. Haz clic en el botón de reproducción.");
                }
            });
        };

        const playNextSongInPlaylist = () => {
            if (currentPlaylist.length === 0) return;
            if (currentPlaylist.length === 1 && audioPlayerElement.ended) {
                audioPlayerElement.currentTime = 0;
                isAudioPlaying = false;
                togglePlayPauseButton.textContent = 'Reproducir';
                return;
            }
            currentSongPlayingIndex = (currentSongPlayingIndex + 1) % currentPlaylist.length;
            playSpecificSongByIndex(currentSongPlayingIndex);
        };

        const playPreviousSongInPlaylist = () => {
            if (currentPlaylist.length === 0) return;
            currentSongPlayingIndex = (currentSongPlayingIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
            playSpecificSongByIndex(currentSongPlayingIndex);
        };

        const getTriangleColorValue = (colorName, alpha) => {
            switch (colorName) {
                case 'red':
                    return `rgba(255, 0, 0, ${alpha})`;
                case 'green':
                    return `rgba(0, 255, 0, ${alpha})`;
                case 'blue':
                    return `rgba(0, 0, 255, ${alpha})`;
                case 'yellow':
                    return `rgba(255, 255, 0, ${alpha})`;
                case 'purple':
                    return `rgba(128, 0, 128, ${alpha})`;
                case 'cyan':
                    return `rgba(0, 255, 255, ${alpha})`;
                case 'magenta':
                    return `rgba(255, 0, 255, ${alpha})`;
                case 'white':
                    return `rgba(255, 255, 255, ${alpha})`;
                case 'black':
                    return `rgba(0, 0, 0, ${alpha})`;
                case 'orange':
                    return `rgba(255, 165, 0, ${alpha})`;
                case 'light-blue':
                    return `rgba(173, 216, 230, ${alpha})`;
                case 'lime':
                    return `rgba(0, 255, 0, ${alpha})`;
                case 'gold':
                    return `rgba(255, 215, 0, ${alpha})`;
                case 'silver':
                    return `rgba(192, 192, 192, ${alpha})`;
                case 'teal':
                    return `rgba(0, 128, 128, ${alpha})`;
                case 'indigo':
                    return `rgba(75, 0, 130, ${alpha})`;
                case 'maroon':
                    return `rgba(128, 0, 0, ${alpha})`;
                case 'olive':
                    return `rgba(128, 128, 0, ${alpha})`;
                case 'navy':
                    return `rgba(0, 0, 128, ${alpha})`;
                case 'pink':
                    return `rgba(255, 192, 203, ${alpha})`;
                case 'brown':
                    return `rgba(165, 42, 42, ${alpha})`;
                case 'grey':
                    return `rgba(128, 128, 128, ${alpha})`;
                default:
                    return `rgba(0, 0, 255, ${alpha})`;  
            }
        };

        const formatSongTime = (seconds) => {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = Math.floor(seconds % 60);
            return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
        };
 
        addSongsButton.addEventListener('click', async () => {
            try {
                const fileHandles = await window.showOpenFilePicker({
                    multiple: true,
                    types: [{
                        description: 'Audio Files',
                        accept: {
                            'audio/*': ['.mp3', '.wav', '.ogg', '.aac']
                        }
                    }]
                });

                let newSongsAddedSuccessfully = false;
                let currentSessionFileHandles = [];

                for (const handle of fileHandles) {
                    const permissionStatus = await handle.requestPermission({
                        mode: 'read'
                    });
                    if (permissionStatus === 'granted') {
                        currentSessionFileHandles.push({
                            name: handle.name,
                            handle: handle
                        });
                        newSongsAddedSuccessfully = true;
                    } else {
                        console.warn(`Permiso denegado para el archivo: ${handle.name}`);
                    }
                }

                if (newSongsAddedSuccessfully) {
                    populateSongSelectionDropdown(currentSessionFileHandles);
                    alert("Canciones añadidas a la lista de reproducción. Tenga en cuenta que las canciones locales no se guardarán entre sesiones del navegador.");
                    togglePlayPauseButton.textContent = 'Reproducir';
                    isAudioPlaying = false;
                } else {
                    alert("No se añadieron nuevas canciones o se denegaron los permisos.");
                }
            } catch (error) {
                console.error("Error al seleccionar archivos con File System Access API:", error);
                if (error.name === 'AbortError') {
                    console.log("Selección de archivo cancelada por el usuario.");
                } else {
                    alert("Hubo un error al intentar añadir canciones. Asegúrate de dar los permisos necesarios.");
                }
            }
        });

        openControlsButton.addEventListener('click', () => {
            visualizerControlsPanel.classList.add('open');
        });

        closeControlsButton.addEventListener('click', () => {
            visualizerControlsPanel.classList.remove('open');
        });

        window.addEventListener('click', (event) => {
            if (visualizerControlsPanel.classList.contains('open') &&
                !visualizerControlsPanel.contains(event.target) &&
                !openControlsButton.contains(event.target)) {
                visualizerControlsPanel.classList.remove('open');
            }
        });

        togglePlayPauseButton.addEventListener('click', togglePlayPauseAudio);
        prevSongButton.addEventListener('click', playPreviousSongInPlaylist);
        nextSongButton.addEventListener('click', playNextSongInPlaylist);

        volumeSliderInput.addEventListener('input', () => {
            audioPlayerElement.volume = volumeSliderInput.value;
            saveAppSetting('volume', volumeSliderInput.value);
        });

        audioPlayerElement.addEventListener('ended', playNextSongInPlaylist);

        songSelectionDropdown.addEventListener('change', async (event) => {
            const newIndex = parseInt(event.target.value, 10);
            if (newIndex !== currentSongPlayingIndex) {
                currentSongPlayingIndex = newIndex;
                saveAppSetting('currentSongIndex', currentSongPlayingIndex);
                const songToLoad = currentPlaylist[currentSongPlayingIndex];
                const newSongSource = await getSongFileSource(songToLoad);
                if (newSongSource) {
                    if (audioPlayerElement.src && audioPlayerElement.src.startsWith('blob:')) {
                        URL.revokeObjectURL(audioPlayerElement.src);
                    }
                    audioPlayerElement.src = newSongSource;
                    audioPlayerElement.load();
                    if (isAudioPlaying) {
                        audioPlayerElement.play().catch(error => {
                            console.error("Error al reproducir tras cambiar de canción:", error);
                            togglePlayPauseButton.textContent = 'Reproducir';
                            isAudioPlaying = false;
                            if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
                                alert("Se necesita interacción del usuario para reproducir audio. Haz clic en el botón de reproducción.");
                            }
                        });
                    } else {
                        togglePlayPauseButton.textContent = 'Reproducir';
                    }
                } else {
                    audioPlayerElement.src = '';
                    console.warn("No se pudo cargar la canción seleccionada.");
                    togglePlayPauseButton.textContent = 'Reproducir';
                    isAudioPlaying = false;
                }
            }
        });

        audioPlayerElement.addEventListener('timeupdate', () => {
            songProgressBar.value = audioPlayerElement.currentTime;
            currentTimeDisplay.textContent = formatSongTime(audioPlayerElement.currentTime);
        });

        audioPlayerElement.addEventListener('loadedmetadata', () => {
            songProgressBar.max = audioPlayerElement.duration;
            totalTimeDisplay.textContent = formatSongTime(audioPlayerElement.duration);
            currentTimeDisplay.textContent = formatSongTime(audioPlayerElement.currentTime);
        });

        songProgressBar.addEventListener('input', () => {
            audioPlayerElement.currentTime = songProgressBar.value;
        });

        barColorSelect.addEventListener('change', () => {
            currentBarColor = barColorSelect.value;
            saveAppSetting('barColor', currentBarColor);
            drawAudioVisualization();
        });

        waveLineColorSelect.addEventListener('change', () => {
            currentWaveLineColor = waveLineColorSelect.value;
            saveAppSetting('waveLineColor', currentWaveLineColor);
            drawAudioVisualization();
        });

        barIntensitySlider.addEventListener('input', () => {
            currentBarIntensity = parseFloat(barIntensitySlider.value);
            saveAppSetting('barIntensity', currentBarIntensity);
            drawAudioVisualization();
        });

        waveIntensitySlider.addEventListener('input', () => {
            currentWaveIntensity = parseFloat(waveIntensitySlider.value);
            saveAppSetting('waveIntensity', currentWaveIntensity);
            drawAudioVisualization();
        });

        triangleSizeSlider.addEventListener('input', () => {
            currentTriangleSize = parseFloat(triangleSizeSlider.value);
            saveAppSetting('triangleSize', currentTriangleSize);
            drawAudioVisualization();
        });

        innerTriangleColorSelect.addEventListener('change', () => {
            currentInnerTriangleColor = innerTriangleColorSelect.value;
            saveAppSetting('innerTriangleColor', currentInnerTriangleColor);
            drawAudioVisualization();
        });

        outerTriangleColorSelect.addEventListener('change', () => {
            currentOuterTriangleColor = outerTriangleColorSelect.value;
            saveAppSetting('outerTriangleColor', currentOuterTriangleColor);
            drawAudioVisualization();
        });

        visualizerTypeSelect.addEventListener('change', () => {
            activeVisualizerTypes = Array.from(visualizerTypeSelect.selectedOptions).map(option => option.value);
            if (activeVisualizerTypes.length === 0) {
                activeVisualizerTypes = ['all'];
                Array.from(visualizerTypeSelect.options).find(option => option.value === 'all').selected = true;
            }
            saveAppSetting('visualizerType', activeVisualizerTypes);
            drawAudioVisualization();
        });

        resetDefaultsButton.addEventListener('click', resetVisualizerSettings);

        loadVisualizerSettings();
    }
});
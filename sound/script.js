document.addEventListener('DOMContentLoaded', () => {
  const currentUrl = window.location.href;
  const newTabPageUrl = chrome.runtime.getURL("sound/index.html");

  if (currentUrl === newTabPageUrl) {
    const audioPlayer = document.getElementById('audioPlayer');
    const canvas = document.getElementById('audioSpectrumCanvas');
    const ctx = canvas.getContext('2d');

    // Elementos del Panel de Controles
    const controlsPanel = document.getElementById('controlsPanel');
    const openControlsButton = document.getElementById('openControlsButton');
    const closeControlsButton = document.getElementById('closeControlsButton');

    // Controles del Reproductor de Música
    const togglePlayPauseButton = document.getElementById('togglePlayPauseButton');
    const prevSongButton = document.getElementById('prevSongButton');
    const nextSongButton = document.getElementById('nextSongButton');
    const volumeSliderInline = document.getElementById('volumeSliderInline');

    // Nuevo: Elementos para la Selección de Canciones y la Barra de Progreso
    const songSelect = document.getElementById('songSelect');
    const songProgressBar = document.getElementById('songProgressBar');
    const currentTimeSpan = document.getElementById('currentTime');
    const totalTimeSpan = document.getElementById('totalTime');


    // Configuraciones del Canvas
    const barColorSelect = document.getElementById('barColorSelect');
    const waveLineColorSelect = document.getElementById('waveLineColorSelect');
    const pokerChipColorSelect = document.getElementById('pokerChipColorSelect');
    const intensitySlider = document.getElementById('intensitySlider');
    const visualizerTypeSelect = document.getElementById('visualizerTypeSelect');

    // Controles individuales de Intensidad
    const barIntensitySlider = document.getElementById('barIntensitySlider');
    const waveIntensitySlider = document.getElementById('waveIntensitySlider');
    const triangleSizeSlider = document.getElementById('triangleSizeSlider');

    // Selectores de color de Triángulo
    const innerTriangleColorSelect = document.getElementById('innerTriangleColorSelect');
    const outerTriangleColorSelect = document.getElementById('outerTriangleColorSelect');

    // Nuevo: Botón de Reinicio
    const resetDefaultsButton = document.getElementById('resetDefaultsButton');

    let audioContext;
    let analyser;
    let source;
    let isPlaying = false;

    // --- Definir Configuraciones por Defecto ---
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
      currentSongIndex: 0
    };

    // --- Configuraciones guardadas para el canvas y la música (valores por defecto) ---
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

    // --- Lista de Reproducción ---
    const playlist = [
      'audio/eru ∇.mp3',
      'audio/gerbera .mp3',
      'audio/MEGITSUNE.mp3',
      'audio/Odo.mp3',
      'audio/AI.mp3'
    ];
    let currentSongIndex = defaultSettings.currentSongIndex;

    // Establece las dimensiones del canvas a pantalla completa
    const setCanvasDimensions = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setCanvasDimensions();
    window.addEventListener('resize', setCanvasDimensions);

    // --- Función para enviar mensaje al script de fondo para guardar una configuración ---
    const saveSetting = (key, value) => {
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

    // --- Rellena el selector de canciones ---
    const populateSongSelect = () => {
      songSelect.innerHTML = ''; // Limpia las opciones existentes
      playlist.forEach((songPath, index) => {
        const option = document.createElement('option');
        // Extrae el nombre de la canción de la ruta (ej. "eru ∇.mp3" de "audio/eru ∇.mp3")
        const songName = songPath.split('/').pop().replace('.mp3', '');
        option.value = index;
        option.textContent = songName;
        songSelect.appendChild(option);
      });
      songSelect.value = currentSongIndex; // Establece la selección inicial
    };


    // --- Carga las configuraciones guardadas y las aplica ---
    const loadSettings = () => {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          action: 'loadSettings'
        }, (result) => {
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

          currentSongIndex = result.currentSongIndex !== undefined ? result.currentSongIndex : defaultSettings.currentSongIndex;
          if (playlist[currentSongIndex]) {
            audioPlayer.src = playlist[currentSongIndex];
          }
          populateSongSelect(); // Rellenar después de cargar currentSongIndex

          draw();
        });
      } else {
        console.warn("chrome.runtime.sendMessage no está disponible. La configuración no se cargará de forma persistente.");
        applySettings(defaultSettings);
        populateSongSelect(); // Rellenar incluso si la configuración no está cargada
        draw();
      }
    };

    // --- Función para aplicar configuraciones a los controles y variables ---
    const applySettings = (settings) => {
      audioPlayer.volume = settings.volume;
      volumeSliderInline.value = settings.volume;
      saveSetting('volume', settings.volume);

      currentBarColor = settings.barColor;
      barColorSelect.value = settings.barColor;
      saveSetting('barColor', settings.barColor);

      currentWaveLineColor = settings.waveLineColor;
      waveLineColorSelect.value = settings.waveLineColor;
      saveSetting('waveLineColor', settings.waveLineColor);

      currentPokerChipColor = settings.pokerChipColor;
      pokerChipColorSelect.value = settings.pokerChipColor;
      saveSetting('pokerChipColor', settings.pokerChipColor);

      currentIntensity = settings.intensity;
      intensitySlider.value = settings.intensity;
      saveSetting('intensity', currentIntensity);

      currentBarIntensity = settings.barIntensity;
      barIntensitySlider.value = settings.barIntensity;
      saveSetting('barIntensity', currentBarIntensity);

      currentWaveIntensity = settings.waveIntensity;
      waveIntensitySlider.value = settings.waveIntensity;
      saveSetting('waveIntensity', currentWaveIntensity);

      currentTriangleSize = settings.triangleSize;
      triangleSizeSlider.value = settings.triangleSize;
      saveSetting('triangleSize', currentTriangleSize);

      currentInnerTriangleColor = settings.innerTriangleColor;
      innerTriangleColorSelect.value = settings.innerTriangleColor;
      saveSetting('innerTriangleColor', settings.innerTriangleColor);

      currentOuterTriangleColor = settings.outerTriangleColor;
      outerTriangleColorSelect.value = settings.outerTriangleColor;
      saveSetting('outerTriangleColor', settings.outerTriangleColor);


      currentVisualizerTypes = settings.visualizerType;
      Array.from(visualizerTypeSelect.options).forEach(option => {
        option.selected = settings.visualizerType.includes(option.value);
      });
      saveSetting('visualizerType', currentVisualizerTypes);

      currentSongIndex = settings.currentSongIndex;
      if (playlist[currentSongIndex]) {
        audioPlayer.src = playlist[currentSongIndex];
      }
      saveSetting('currentSongIndex', currentSongIndex);
      populateSongSelect(); // Actualiza el selector después de aplicar la configuración

      draw();
    };

    // --- Función para reiniciar todas las configuraciones a sus valores por defecto ---
    const resetSettings = () => {
      applySettings(defaultSettings);
      if (isPlaying) {
        audioPlayer.pause();
        isPlaying = false;
        togglePlayPauseButton.textContent = 'Reproducir';
      }
      console.log("Todas las configuraciones se han restablecido a sus valores por defecto.");
    };

    let dataArray;

    const pokerChips = [];
    const MAX_POKER_CHIPS = 5;

    // --- Inicialización de la API de Web Audio ---
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

        dataArray = new Uint8Array(analyser.frequencyBinCount);
      }
    };

    // --- Funciones del Reproductor de Música ---
    const playCurrentOrNextSong = () => {
      initAudio();
      if (!audioPlayer.src || audioPlayer.src === window.location.href) {
        if (playlist[currentSongIndex]) {
          audioPlayer.src = playlist[currentSongIndex];
        } else {
          console.error("No hay fuente de audio disponible en la lista de reproducción.");
          return;
        }
      }

      if (audioPlayer.paused) {
        audioPlayer.play()
          .then(() => {
            isPlaying = true;
            togglePlayPauseButton.textContent = 'Reproduciendo...';
            saveSetting('currentSongIndex', currentSongIndex);
            draw();
          })
          .catch(error => {
            console.error("Error al reproducir audio:", error);
            togglePlayPauseButton.textContent = 'Reproducir';
          });
      } else {
        audioPlayer.pause();
        isPlaying = false;
        togglePlayPauseButton.textContent = 'En Pausa';
      }
    };

    const playSpecificSong = (index) => {
      initAudio();
      if (playlist[index]) {
        audioPlayer.src = playlist[index];
        audioPlayer.play()
          .then(() => {
            isPlaying = true;
            currentSongIndex = index;
            togglePlayPauseButton.textContent = 'Reproduciendo...';
            saveSetting('currentSongIndex', currentSongIndex);
            songSelect.value = currentSongIndex; // Actualiza el selector
            draw();
          })
          .catch(error => {
            console.error("Error al reproducir canción específica:", error);
            togglePlayPauseButton.textContent = 'Reproducir';
          });
      } else {
        console.error(`Canción en el índice ${index} no encontrada en la lista de reproducción.`);
      }
    };

    const playNextSong = () => {
      currentSongIndex = (currentSongIndex + 1) % playlist.length;
      playSpecificSong(currentSongIndex);
    };

    const playPreviousSong = () => {
      currentSongIndex = (currentSongIndex - 1 + playlist.length) % playlist.length;
      playSpecificSong(currentSongIndex);
    };

    // Ayudante para obtener el color RGBA basado en la entrada de cadena
    const getTriangleColor = (colorName, alpha) => {
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
          return `rgba(173, 216, 230, ${alpha})`; // Azul claro
        case 'lime':
          return `rgba(0, 255, 0, ${alpha})`; // Verde lima
        case 'gold':
          return `rgba(255, 215, 0, ${alpha})`; // Oro
        case 'silver':
          return `rgba(192, 192, 192, ${alpha})`; // Plata
        case 'teal':
          return `rgba(0, 128, 128, ${alpha})`; // Verde azulado
        case 'indigo':
          return `rgba(75, 0, 130, ${alpha})`; // Índigo
        case 'maroon':
          return `rgba(128, 0, 0, ${alpha})`; // Granate
        case 'olive':
          return `rgba(128, 128, 0, ${alpha})`; // Oliva
        case 'navy':
          return `rgba(0, 0, 128, ${alpha})`; // Azul marino
        case 'pink':
          return `rgba(255, 192, 203, ${alpha})`; // Rosa
        case 'brown':
          return `rgba(165, 42, 42, ${alpha})`; // Marrón
        case 'grey':
          return `rgba(128, 128, 128, ${alpha})`; // Gris
        default:
          return `rgba(0, 0, 255, ${alpha})`; // Por defecto azul
      }
    };

    // --- Función auxiliar para formatear el tiempo (ej. 1:23) ---
    const formatTime = (seconds) => {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    };


    // --- Función de Dibujo ---
    const draw = () => {
      if (isPlaying && analyser) {
        requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);
      } else if (!isPlaying && !analyser && audioContext) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      } else if (!isPlaying && !audioContext) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      if (!analyser && audioContext) {
        initAudio();
        if (!analyser) {
          requestAnimationFrame(draw);
          return;
        }
      } else if (!analyser && !audioContext) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const totalHeight = canvas.height;
      const totalWidth = canvas.width;

      // Determina qué visualizadores dibujar
      const drawAll = currentVisualizerTypes.includes('all');
      const drawBars = drawAll || currentVisualizerTypes.includes('bars');
      const drawWavy = drawAll || currentVisualizerTypes.includes('wavy');
      const drawChips = drawAll || currentVisualizerTypes.includes('chips');
      const drawTriangles = drawAll || currentVisualizerTypes.includes('triangles');


      // Visualizador 1: Barras
      if (drawBars) {
        const barWidth = (canvas.width / dataArray.length) * 2.5;
        let xBar = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const barHeight = dataArray[i] * 0.5 * currentIntensity * currentBarIntensity;
          const intensity = dataArray[i] / 255;

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
              break; // Nueva opción de color
            case 'cyan':
              hue = 180;
              break; // Nueva opción de color
            case 'magenta':
              hue = 300;
              break; // Nueva opción de color
            case 'yellow':
              hue = 60;
              break; // Nueva opción de color
            case 'dynamic':
            default:
              // Mantiene el comportamiento dinámico original
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

      // Visualizador de Triángulos
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

        // Obtener colores para los triángulos
        const outerColor = getTriangleColor(currentOuterTriangleColor, alpha);
        const innerColor = getTriangleColor(currentInnerTriangleColor, alpha * 1.5);

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(Math.PI);

        // Triángulo Exterior
        ctx.beginPath();
        ctx.moveTo(0, -size / 2);
        ctx.lineTo(size / 2 * Math.sqrt(3) / 2, size / 2 / 2);
        ctx.lineTo(-size / 2 * Math.sqrt(3) / 2, size / 2 / 2);
        ctx.closePath();
        ctx.fillStyle = outerColor;
        ctx.fill();

        // Triángulo Interior
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

      // Visualizador 3: Líneas Onduladas
      if (drawWavy) {
        let waveHue;
        let strokeStyleValue;

        switch (currentWaveLineColor) {
          case 'white':
            strokeStyleValue = 'rgba(255, 255, 255, 0.7)';
            break;
          case 'orange':
            waveHue = 30;
            strokeStyleValue = `hsl(${waveHue}, 100%, 50%, 0.7)`;
            break;
          case 'pink':
            waveHue = 330;
            strokeStyleValue = `hsl(${waveHue}, 100%, 50%, 0.7)`;
            break;
          case 'red':
            waveHue = 0;
            strokeStyleValue = `hsl(${waveHue}, 100%, 50%, 0.7)`;
            break; // Nuevo
          case 'green':
            waveHue = 120;
            strokeStyleValue = `hsl(${waveHue}, 100%, 50%, 0.7)`;
            break; // Nuevo
          case 'blue':
            waveHue = 240;
            strokeStyleValue = `hsl(${waveHue}, 100%, 50%, 0.7)`;
            break; // Nuevo
          case 'yellow':
            waveHue = 60;
            strokeStyleValue = `hsl(${waveHue}, 100%, 50%, 0.7)`;
            break; // Nuevo
          case 'purple':
            waveHue = 270;
            strokeStyleValue = `hsl(${waveHue}, 100%, 50%, 0.7)`;
            break; // Nuevo
          case 'cyan':
            waveHue = 180;
            strokeStyleValue = `hsl(${waveHue}, 100%, 50%, 0.7)`;
            break; // Nuevo
          case 'magenta':
            waveHue = 300;
            strokeStyleValue = `hsl(${waveHue}, 100%, 50%, 0.7)`;
            break; // Nuevo
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

      // --- Visualizador de Fichas de Póker ---
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
          chip.vy += 0.1; // Gravedad fija

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
            case 'green':
              hue = 120;
              break;
            case 'gray':
              chipCalculatedColor = `rgba(150, 150, 150, ${1 - intensity * 0.5})`;
              break;
            case 'gold':
              hue = 40;
              break;
            case 'red':
              hue = 0;
              break; // Nuevo
            case 'blue':
              hue = 240;
              break; // Nuevo
            case 'yellow':
              hue = 60;
              break; // Nuevo
            case 'purple':
              hue = 270;
              break; // Nuevo
            case 'cyan':
              hue = 180;
              break; // Nuevo
            case 'magenta':
              hue = 300;
              break; // Nuevo
            case 'orange':
              hue = 30;
              break; // Nuevo
            case 'random':
            default:
              // Mantiene el comportamiento aleatorio original
              switch (chip.colorType) {
                case 'red':
                  hue = 0 + (intensity * 20);
                  break;
                case 'yellow':
                  hue = 60 + (intensity * 20);
                  break;
                case 'blue':
                default:
                  hue = 200 + (intensity * 4);
                  break;
              }
              break;
          }

          if (currentPokerChipColor !== 'gray') {
            saturation = 80 - (intensity * 20);
            lightness = 40 + (intensity * 30);
            chipCalculatedColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
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
    };

    function createPokerChip(value, canvasWidth, canvasHeight) {
      const baseRadius = 30;
      const initialX = Math.random() * (canvasWidth - baseRadius * 4) + baseRadius * 2;
      const initialY = canvasHeight - baseRadius;
      const vx = (Math.random() - 0.5) * 5;
      const vy = -(5 + Math.random() * 10);
      const colorTypes = ['blue', 'red', 'yellow', 'green', 'purple', 'cyan', 'magenta', 'orange']; // Más colores aleatorios para las fichas
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

    // --- Escuchadores de Eventos para el Panel Deslizante ---
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

    // --- Escuchadores de Eventos del Reproductor de Música (en los controles en línea) ---
    togglePlayPauseButton.addEventListener('click', playCurrentOrNextSong);
    prevSongButton.addEventListener('click', playPreviousSong);
    nextSongButton.addEventListener('click', playNextSong);

    volumeSliderInline.addEventListener('input', () => {
      audioPlayer.volume = volumeSliderInline.value;
      saveSetting('volume', volumeSliderInline.value);
    });

    audioPlayer.addEventListener('ended', playNextSong);

    // Nuevo: Escuchador del selector de canciones
    songSelect.addEventListener('change', (event) => {
      const newIndex = parseInt(event.target.value, 10);
      if (newIndex !== currentSongIndex) {
        playSpecificSong(newIndex);
      }
    });

    // Nuevo: Escuchadores de la barra de progreso de audio
    audioPlayer.addEventListener('timeupdate', () => {
      songProgressBar.value = audioPlayer.currentTime;
      currentTimeSpan.textContent = formatTime(audioPlayer.currentTime);
    });

    audioPlayer.addEventListener('loadedmetadata', () => {
      songProgressBar.max = audioPlayer.duration;
      totalTimeSpan.textContent = formatTime(audioPlayer.duration);
      currentTimeSpan.textContent = formatTime(audioPlayer.currentTime); // Actualiza el tiempo actual al cargar
    });

    songProgressBar.addEventListener('input', () => {
      audioPlayer.currentTime = songProgressBar.value;
    });


    // --- Escuchadores de Eventos de Configuración del Canvas (en los controles en línea) ---
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

    // Nuevo: Escuchador de Eventos para el Botón de Reinicio
    resetDefaultsButton.addEventListener('click', resetSettings);


    // Carga inicial de las configuraciones cuando el script inicia
    loadSettings();
    draw();
  } else {
    console.log("No estás en la página de inicio de la extensión.");
    // No hacer nada si no estamos en la página de inicio
  }
});
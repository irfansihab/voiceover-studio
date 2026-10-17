/**
 * Audio Visualizer & Waveform Studio Canvas
 * Renders 60FPS real-time glowing spectrum/oscilloscope and
 * interactive static waveform with scrubber and trim regions.
 */

export class AudioVisualizer {
  constructor(canvasElement, audioEngine) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.audioEngine = audioEngine;
    this.animationId = null;
    this.mode = 'spectrum'; // 'spectrum' | 'oscilloscope'
    this.peakLevels = new Float32Array(64);

    // High DPI Retina display support
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  setMode(mode) {
    this.mode = mode;
  }

  start() {
    if (this.animationId) cancelAnimationFrame(this.animationId);

    const render = () => {
      this.draw();
      this.animationId = requestAnimationFrame(render);
    };
    render();
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  draw() {
    const width = this.width;
    const height = this.height;
    const ctx = this.ctx;

    // Clear background
    ctx.clearRect(0, 0, width, height);

    const analyser = this.audioEngine.masterAnalyser;
    if (!analyser) {
      this.drawIdleState(width, height);
      return;
    }

    if (this.mode === 'spectrum') {
      this.drawSpectrum(analyser, width, height);
    } else {
      this.drawOscilloscope(analyser, width, height);
    }
  }

  drawIdleState(width, height) {
    const ctx = this.ctx;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Center subtle pulsing dot
    ctx.fillStyle = 'rgba(99, 102, 241, 0.4)';
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  drawSpectrum(analyser, width, height) {
    const ctx = this.ctx;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const barCount = 48;
    const barSpacing = 4;
    const totalSpacing = (barCount - 1) * barSpacing;
    const barWidth = Math.max(2, (width - totalSpacing) / barCount);

    const step = Math.floor(bufferLength / (barCount * 1.5));

    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += dataArray[i * step + j] || 0;
      }
      const rawValue = sum / step;
      const normalized = rawValue / 255;
      const barHeight = Math.max(4, normalized * (height - 16));

      // Peak drop animation
      if (barHeight > this.peakLevels[i]) {
        this.peakLevels[i] = barHeight;
      } else {
        this.peakLevels[i] = Math.max(4, this.peakLevels[i] - 1.2);
      }

      const x = i * (barWidth + barSpacing);
      const y = height - barHeight;

      // Gradient fill: Indigo -> Cyan -> Hot Pink
      const grad = ctx.createLinearGradient(0, height, 0, 0);
      grad.addColorStop(0, '#4f46e5');
      grad.addColorStop(0.5, '#06b6d4');
      grad.addColorStop(1, '#f43f5e');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [3, 3, 0, 0]);
      ctx.fill();

      // Peak Dot
      const peakY = height - this.peakLevels[i] - 3;
      ctx.fillStyle = '#a5f3fc';
      ctx.beginPath();
      ctx.roundRect(x, Math.max(2, peakY), barWidth, 2, [1, 1, 1, 1]);
      ctx.fill();
    }
  }

  drawOscilloscope(analyser, width, height) {
    const ctx = this.ctx;
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#06b6d4';
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(6, 182, 212, 0.6)';

    ctx.beginPath();
    const sliceWidth = width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Reset shadow
    ctx.shadowBlur = 0;
  }
}

/**
 * Interactive Static Waveform Canvas for Trimming and Scrubbing
 */
export class WaveformCanvas {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.audioBuffer = null;
    this.playheadPercent = 0.0;
    this.trimStartPercent = 0.0;
    this.trimEndPercent = 1.0;
    this.isDragging = false;
    this.dragTarget = null; // 'playhead' | 'start' | 'end'

    this.onSeek = null; // (percent)
    this.onTrimChange = null; // (startPercent, endPercent)

    this.setupInteractions();
    this.resizeCanvas();
  }

  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.draw();
  }

  setAudioBuffer(buffer) {
    this.audioBuffer = buffer;
    this.playheadPercent = 0.0;
    this.trimStartPercent = 0.0;
    this.trimEndPercent = 1.0;
    this.draw();
  }

  setPlayhead(percent) {
    this.playheadPercent = Math.max(0, Math.min(1, percent));
    this.draw();
  }

  setupInteractions() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.width));
      return (e.clientX - rect.left) / rect.width;
    };

    this.canvas.addEventListener('mousedown', (e) => {
      const pos = getPos(e);
      // Check proximity to trim handles
      if (Math.abs(pos - this.trimStartPercent) < 0.03) {
        this.dragTarget = 'start';
      } else if (Math.abs(pos - this.trimEndPercent) < 0.03) {
        this.dragTarget = 'end';
      } else {
        this.dragTarget = 'playhead';
        this.playheadPercent = pos;
        if (this.onSeek) this.onSeek(pos);
      }
      this.isDragging = true;
      this.draw();
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const pos = getPos(e);

      if (this.dragTarget === 'start') {
        this.trimStartPercent = Math.min(pos, this.trimEndPercent - 0.05);
        if (this.onTrimChange) this.onTrimChange(this.trimStartPercent, this.trimEndPercent);
      } else if (this.dragTarget === 'end') {
        this.trimEndPercent = Math.max(pos, this.trimStartPercent + 0.05);
        if (this.onTrimChange) this.onTrimChange(this.trimStartPercent, this.trimEndPercent);
      } else if (this.dragTarget === 'playhead') {
        this.playheadPercent = pos;
        if (this.onSeek) this.onSeek(pos);
      }
      this.draw();
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.dragTarget = null;
    });
  }

  draw() {
    const width = this.width;
    const height = this.height;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, width, height);

    if (!this.audioBuffer) {
      // Empty waveform placeholder line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = '12px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Rekam atau generate suara untuk melihat waveform studio', width / 2, height / 2 - 8);
      return;
    }

    const data = this.audioBuffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;

    // Draw Inactive Dimmed Regions (outside trim)
    const startX = this.trimStartPercent * width;
    const endX = this.trimEndPercent * width;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, startX, height);
    ctx.fillRect(endX, 0, width - endX, height);

    // Draw Waveform Bars
    for (let i = 0; i < width; i += 2) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = data[(i * step) + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }

      const barHeight = Math.max(2, (max - min) * amp * 0.9);
      const y = (height - barHeight) / 2;

      // Color active trimmed zone brighter
      if (i >= startX && i <= endX) {
        ctx.fillStyle = i < this.playheadPercent * width ? '#38bdf8' : '#818cf8';
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      }

      ctx.fillRect(i, y, 1.5, barHeight);
    }

    // Draw Trim Markers
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    // Start trim line
    ctx.beginPath();
    ctx.moveTo(startX, 0);
    ctx.lineTo(startX, height);
    ctx.stroke();
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(startX - 4, 0, 8, 12);

    // End trim line
    ctx.strokeStyle = '#f43f5e';
    ctx.beginPath();
    ctx.moveTo(endX, 0);
    ctx.lineTo(endX, height);
    ctx.stroke();
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(endX - 4, height - 12, 8, 12);

    // Draw Playhead
    const playheadX = this.playheadPercent * width;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(56, 189, 248, 0.8)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Playhead head icon
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(playheadX - 6, 0);
    ctx.lineTo(playheadX + 6, 0);
    ctx.lineTo(playheadX, 9);
    ctx.closePath();
    ctx.fill();
  }
}

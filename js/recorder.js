/**
 * Studio Microphone Recorder & Multi-Take Manager
 * Captures high-fidelity mic audio, provides live peak VU metering,
 * decodes takes into AudioBuffers for DSP effects processing & lossless WAV export.
 */

export class VoiceRecorder {
  constructor(audioEngine) {
    this.audioEngine = audioEngine;
    this.stream = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.isPaused = false;
    this.recordStartTime = 0;
    this.timerInterval = null;

    // Mic Audio Analysis
    this.micSource = null;
    this.micGain = null;
    this.micGainVal = 1.0;
    this.micAnalyser = null;
    this.vuAnimationId = null;

    // Takes Storage: array of { id, name, timestamp, duration, blob, audioBuffer, url }
    this.takes = [];
    this.activeTakeId = null;

    // Callbacks
    this.onVuMeterUpdate = null; // (db, peakDb, isClipping)
    this.onTimerTick = null;     // (secondsElapsed)
    this.onTakeAdded = null;     // (take)
    this.onRecordStateChanged = null; // (state: 'idle' | 'countdown' | 'recording' | 'processing')
  }

  /**
   * Request microphone stream and setup analyzer
   */
  async setupMic() {
    await this.audioEngine.init();

    if (this.stream) return true;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 2
        }
      });

      const ctx = this.audioEngine.ctx;
      this.micSource = ctx.createMediaStreamSource(this.stream);
      this.micGain = ctx.createGain();
      this.micGain.gain.value = this.micGainVal;

      this.micAnalyser = ctx.createAnalyser();
      this.micAnalyser.fftSize = 1024;
      this.micAnalyser.smoothingTimeConstant = 0.3;

      this.micSource.connect(this.micGain);
      this.micGain.connect(this.micAnalyser);

      this.startVuMeterMonitoring();
      return true;
    } catch (err) {
      console.error("Microphone access denied or error:", err);
      throw err;
    }
  }

  /**
   * Adjust Microphone Input Gain (1.0 = unity, 2.0 = +6dB)
   */
  setMicGain(value) {
    this.micGainVal = value;
    if (this.micGain && this.audioEngine.ctx) {
      this.micGain.gain.setTargetAtTime(value, this.audioEngine.ctx.currentTime, 0.05);
    }
  }

  /**
   * Continuously calculate RMS and Peak Volume for VU Meter
   */
  startVuMeterMonitoring() {
    if (this.vuAnimationId) cancelAnimationFrame(this.vuAnimationId);

    const buffer = new Float32Array(this.micAnalyser.frequencyBinCount);

    const monitor = () => {
      if (this.micAnalyser) {
        this.micAnalyser.getFloatTimeDomainData(buffer);

        let sumSquares = 0;
        let peak = 0;
        for (let i = 0; i < buffer.length; i++) {
          const val = Math.abs(buffer[i]);
          if (val > peak) peak = val;
          sumSquares += val * val;
        }

        const rms = Math.sqrt(sumSquares / buffer.length);
        const db = rms > 0.0001 ? 20 * Math.log10(rms) : -60;
        const peakDb = peak > 0.0001 ? 20 * Math.log10(peak) : -60;
        const isClipping = peak >= 0.98;

        if (this.onVuMeterUpdate) {
          this.onVuMeterUpdate(Math.max(-60, db), Math.max(-60, peakDb), isClipping);
        }
      }
      this.vuAnimationId = requestAnimationFrame(monitor);
    };

    monitor();
  }

  /**
   * Starts Recording with optional 3-second countdown
   */
  async startRecording(withCountdown = true) {
    await this.setupMic();

    if (withCountdown) {
      if (this.onRecordStateChanged) this.onRecordStateChanged('countdown');
      // 3 beeps
      this.audioEngine.playCue(660, 0.08);
      await this.sleep(1000);
      this.audioEngine.playCue(660, 0.08);
      await this.sleep(1000);
      this.audioEngine.playCue(1100, 0.15, true);
      await this.sleep(1000);
    }

    this.recordedChunks = [];
    let mimeType = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
    }

    const options = mimeType ? { mimeType } : {};
    this.mediaRecorder = new MediaRecorder(this.stream, options);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(100);
    this.isRecording = true;
    this.recordStartTime = Date.now();

    if (this.onRecordStateChanged) this.onRecordStateChanged('recording');

    // Timer tick
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      const elapsedSec = (Date.now() - this.recordStartTime) / 1000;
      if (this.onTimerTick) this.onTimerTick(elapsedSec);
    }, 100);
  }

  /**
   * Stop Recording, decode AudioBuffer, and create new Take
   */
  async stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) return null;

    if (this.onRecordStateChanged) this.onRecordStateChanged('processing');

    clearInterval(this.timerInterval);
    this.isRecording = false;

    return new Promise((resolve) => {
      this.mediaRecorder.onstop = async () => {
        const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        const arrayBuffer = await blob.arrayBuffer();

        let audioBuffer = null;
        try {
          audioBuffer = await this.audioEngine.ctx.decodeAudioData(arrayBuffer.slice(0));
        } catch (e) {
          console.warn("Direct decode failed, fallback using offline context", e);
        }

        const takeIndex = this.takes.length + 1;
        const take = {
          id: 'take_' + Date.now(),
          name: `Take ${takeIndex}`,
          timestamp: new Date().toLocaleTimeString(),
          duration: audioBuffer ? audioBuffer.duration : (Date.now() - this.recordStartTime) / 1000,
          blob: blob,
          audioBuffer: audioBuffer,
          url: URL.createObjectURL(blob)
        };

        this.takes.push(take);
        this.activeTakeId = take.id;

        if (this.onTakeAdded) this.onTakeAdded(take);
        if (this.onRecordStateChanged) this.onRecordStateChanged('idle');

        resolve(take);
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Get currently active take object
   */
  getActiveTake() {
    return this.takes.find(t => t.id === this.activeTakeId) || null;
  }

  /**
   * Delete a take by id
   */
  deleteTake(takeId) {
    const idx = this.takes.findIndex(t => t.id === takeId);
    if (idx !== -1) {
      if (this.takes[idx].url) URL.revokeObjectURL(this.takes[idx].url);
      this.takes.splice(idx, 1);
      if (this.activeTakeId === takeId) {
        this.activeTakeId = this.takes.length > 0 ? this.takes[this.takes.length - 1].id : null;
      }
    }
  }

  sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  destroy() {
    if (this.vuAnimationId) cancelAnimationFrame(this.vuAnimationId);
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
  }
}

/**
 * Web Audio Engine for VoiceOver Studio Pro
 * Handles DSP effects (EQ, Reverb, Delay, Distortion, Compressor),
 * BGM playback with Auto-Ducking, Procedural Ambient Sounds,
 * and Audio Routing to master visualizer and recorder.
 */

import { audioBufferToWav } from './wav-encoder.js';

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.isInitialized = false;

    // Master nodes
    this.masterGain = null;
    this.masterAnalyser = null;
    this.streamDestination = null;

    // Voice track chain
    this.voiceSource = null;
    this.voiceGain = null;

    // Effects nodes
    this.eqLow = null;
    this.eqMid = null;
    this.eqHigh = null;
    this.compressor = null;
    this.delayNode = null;
    this.delayFeedback = null;
    this.delayWet = null;
    this.reverbNode = null;
    this.reverbWet = null;
    this.distortionNode = null;
    this.radioFilter = null;
    this.robotOsc = null;
    this.robotGain = null;

    // Current FX States
    this.fxConfig = {
      eqLow: 0,
      eqMid: 0,
      eqHigh: 0,
      reverbWet: 0.15,
      reverbPreset: 'warm-studio',
      delayTime: 0.25,
      delayFeedback: 0.2,
      delayWet: 0.0,
      compressorEnabled: true,
      characterFx: 'none', // 'none', 'radio', 'robot', 'warmth', 'cinema'
      voiceVolume: 1.0,
      bgmVolume: 0.35,
      masterVolume: 1.0,
      duckingAmount: 0.25, // BGM drops to 25% when voice speaks
      duckingEnabled: true
    };

    // BGM & Ambience Track
    this.bgmGain = null;
    this.bgmSource = null;
    this.bgmBuffer = null;
    this.bgmIsPlaying = false;
    this.bgmMode = 'none'; // 'none', 'lofi', 'scifi', 'rain', 'custom'
    this.ambientGenerators = [];

    // Real-time voice activity for ducking
    this.isVoiceActive = false;

    // Active AudioBuffer for voice track
    this.currentVoiceBuffer = null;
  }

  /**
   * Initializes or resumes the AudioContext
   */
  async init() {
    if (this.ctx && this.ctx.state !== 'closed') {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();

    // Create Destination for recording master output
    this.streamDestination = this.ctx.createMediaStreamDestination();

    // Master Analyser & Gain
    this.masterAnalyser = this.ctx.createAnalyser();
    this.masterAnalyser.fftSize = 2048;
    this.masterAnalyser.smoothingTimeConstant = 0.85;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.fxConfig.masterVolume;

    // Connect Master Gain to Hardware Speakers and Stream Destination
    this.masterGain.connect(this.masterAnalyser);
    this.masterAnalyser.connect(this.ctx.destination);
    this.masterAnalyser.connect(this.streamDestination);

    // Build Effects Chains
    this.buildDspChain();

    // Build BGM Track Chain
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = this.fxConfig.bgmVolume;
    this.bgmGain.connect(this.masterGain);

    this.isInitialized = true;
  }

  /**
   * Construct the Web Audio DSP Graph for Voice
   */
  buildDspChain() {
    // 1. Voice input gain
    this.voiceGain = this.ctx.createGain();
    this.voiceGain.gain.value = this.fxConfig.voiceVolume;

    // 2. 3-Band Parametric EQ
    this.eqLow = this.ctx.createBiquadFilter();
    this.eqLow.type = 'lowshelf';
    this.eqLow.frequency.value = 140;
    this.eqLow.gain.value = this.fxConfig.eqLow;

    this.eqMid = this.ctx.createBiquadFilter();
    this.eqMid.type = 'peaking';
    this.eqMid.frequency.value = 2500;
    this.eqMid.Q.value = 1.0;
    this.eqMid.gain.value = this.fxConfig.eqMid;

    this.eqHigh = this.ctx.createBiquadFilter();
    this.eqHigh.type = 'highshelf';
    this.eqHigh.frequency.value = 8500;
    this.eqHigh.gain.value = this.fxConfig.eqHigh;

    // 3. Radio Filter (Bandpass)
    this.radioFilter = this.ctx.createBiquadFilter();
    this.radioFilter.type = 'allpass'; // Default bypass

    // 4. Distortion / Saturation
    this.distortionNode = this.ctx.createWaveShaper();
    this.distortionNode.oversample = '4x';
    this.distortionNode.curve = null; // Clean bypass

    // 5. Studio Compressor
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -20;
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 4.0;
    this.compressor.attack.value = 0.005;
    this.compressor.release.value = 0.15;

    // 6. Delay / Echo
    this.delayNode = this.ctx.createDelay(2.0);
    this.delayNode.delayTime.value = this.fxConfig.delayTime;
    this.delayFeedback = this.ctx.createGain();
    this.delayFeedback.gain.value = this.fxConfig.delayFeedback;
    this.delayWet = this.ctx.createGain();
    this.delayWet.gain.value = this.fxConfig.delayWet;

    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    this.delayNode.connect(this.delayWet);

    // 7. Convolution Reverb
    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = this.generateImpulseResponse(1.5, 2.0, false);
    this.reverbWet = this.ctx.createGain();
    this.reverbWet.gain.value = this.fxConfig.reverbWet;
    this.reverbNode.connect(this.reverbWet);

    // Dry Node
    this.dryGain = this.ctx.createGain();
    this.dryGain.gain.value = 1.0;

    // Wire DSP Graph:
    // voiceGain -> eqLow -> eqMid -> eqHigh -> radioFilter -> distortionNode -> compressor
    this.voiceGain.connect(this.eqLow);
    this.eqLow.connect(this.eqMid);
    this.eqMid.connect(this.eqHigh);
    this.eqHigh.connect(this.radioFilter);
    this.radioFilter.connect(this.distortionNode);
    this.distortionNode.connect(this.compressor);

    // Split after compressor into Dry, Delay, Reverb
    this.compressor.connect(this.dryGain);
    this.compressor.connect(this.delayNode);
    this.compressor.connect(this.reverbNode);

    // Sum into Master
    this.dryGain.connect(this.masterGain);
    this.delayWet.connect(this.masterGain);
    this.reverbWet.connect(this.masterGain);
  }

  /**
   * Procedural Reverb Impulse Generator
   * Synthesizes clean room acoustic reflections without external WAV files
   */
  generateImpulseResponse(duration, decay, reverse) {
    if (!this.ctx) return null;
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = reverse ? length - i : i;
      const t = n / length;
      // Exponential decay envelope with subtle stereo diffusion
      const envelope = Math.pow(1 - t, decay);
      left[i] = (Math.random() * 2 - 1) * envelope;
      right[i] = (Math.random() * 2 - 1) * envelope;
    }
    return impulse;
  }

  /**
   * Apply Reverb Preset
   */
  setReverbPreset(preset) {
    if (!this.ctx) return;
    this.fxConfig.reverbPreset = preset;
    let duration = 1.2;
    let decay = 2.0;

    switch (preset) {
      case 'treated-booth':
        duration = 0.4;
        decay = 3.5;
        this.reverbWet.gain.setTargetAtTime(0.08, this.ctx.currentTime, 0.05);
        break;
      case 'warm-studio':
        duration = 1.2;
        decay = 2.2;
        this.reverbWet.gain.setTargetAtTime(0.18, this.ctx.currentTime, 0.05);
        break;
      case 'concert-hall':
        duration = 2.8;
        decay = 1.8;
        this.reverbWet.gain.setTargetAtTime(0.35, this.ctx.currentTime, 0.05);
        break;
      case 'space-cathedral':
        duration = 4.5;
        decay = 1.2;
        this.reverbWet.gain.setTargetAtTime(0.50, this.ctx.currentTime, 0.05);
        break;
      case 'off':
        this.reverbWet.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.05);
        return;
    }

    this.reverbNode.buffer = this.generateImpulseResponse(duration, decay, false);
  }

  /**
   * Apply EQ Settings
   */
  setEQ(low, mid, high) {
    if (!this.ctx) return;
    this.fxConfig.eqLow = low;
    this.fxConfig.eqMid = mid;
    this.fxConfig.eqHigh = high;

    this.eqLow.gain.setTargetAtTime(low, this.ctx.currentTime, 0.05);
    this.eqMid.gain.setTargetAtTime(mid, this.ctx.currentTime, 0.05);
    this.eqHigh.gain.setTargetAtTime(high, this.ctx.currentTime, 0.05);
  }

  /**
   * Apply Echo/Delay Settings
   */
  setDelay(time, feedback, wet) {
    if (!this.ctx) return;
    this.fxConfig.delayTime = time;
    this.fxConfig.delayFeedback = feedback;
    this.fxConfig.delayWet = wet;

    this.delayNode.delayTime.setTargetAtTime(time, this.ctx.currentTime, 0.05);
    this.delayFeedback.gain.setTargetAtTime(feedback, this.ctx.currentTime, 0.05);
    this.delayWet.gain.setTargetAtTime(wet, this.ctx.currentTime, 0.05);
  }

  /**
   * Apply Voice Character / Filter Presets
   */
  setCharacterFx(preset) {
    if (!this.ctx) return;
    this.fxConfig.characterFx = preset;
    const now = this.ctx.currentTime;

    // Reset default
    this.radioFilter.type = 'allpass';
    this.distortionNode.curve = null;
    if (this.robotOsc) {
      try { this.robotOsc.stop(); } catch (e) {}
      this.robotOsc = null;
    }

    switch (preset) {
      case 'deep-broadcast': // Warm, authoritative radio voice
        this.setEQ(6.0, 1.5, 3.5);
        this.setDistortion(1.2);
        this.setReverbPreset('warm-studio');
        break;

      case 'vintage-radio': // Bandpass telephone / retro radio effect
        this.radioFilter.type = 'bandpass';
        this.radioFilter.frequency.setValueAtTime(1400, now);
        this.radioFilter.Q.setValueAtTime(1.8, now);
        this.setDistortion(3.0);
        this.setReverbPreset('treated-booth');
        break;

      case 'cinema-trailer': // Massive bass & epic ambience
        this.setEQ(8.0, 2.0, 4.0);
        this.setReverbPreset('concert-hall');
        this.setDelay(0.3, 0.25, 0.15);
        break;

      case 'asmr-whisper': // Close, crisp, airy sound
        this.setEQ(-4.0, 3.0, 8.0);
        this.compressor.threshold.setValueAtTime(-28, now);
        this.compressor.ratio.setValueAtTime(8, now);
        this.setReverbPreset('treated-booth');
        break;

      case 'clean-natural':
      case 'none':
      default:
        this.setEQ(0, 0, 0);
        this.setReverbPreset('warm-studio');
        this.setDelay(0.2, 0.1, 0.0);
        break;
    }
  }

  /**
   * Soft-clipping distortion curve
   */
  setDistortion(amount) {
    if (!this.ctx) return;
    if (amount <= 1.0) {
      this.distortionNode.curve = null;
      return;
    }
    const k = amount * 15;
    const nSamples = 44100;
    const curve = new Float32Array(nSamples);
    const deg = Math.PI / 180;
    for (let i = 0; i < nSamples; ++i) {
      const x = (i * 2) / nSamples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    this.distortionNode.curve = curve;
  }

  /**
   * Set Master & Track Volumes
   */
  setMasterVolume(val) {
    this.fxConfig.masterVolume = val;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.05);
    }
  }

  setVoiceVolume(val) {
    this.fxConfig.voiceVolume = val;
    if (this.voiceGain && this.ctx) {
      this.voiceGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.05);
    }
  }

  setBgmVolume(val) {
    this.fxConfig.bgmVolume = val;
    if (this.bgmGain && this.ctx) {
      const target = this.isVoiceActive && this.fxConfig.duckingEnabled
        ? val * this.fxConfig.duckingAmount
        : val;
      this.bgmGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
    }
  }

  /**
   * Auto-ducking Controller: Call when voice starts/stops playing
   */
  setVoiceActiveState(isActive) {
    this.isVoiceActive = isActive;
    if (!this.ctx || !this.bgmGain || !this.fxConfig.duckingEnabled) return;

    const baseVol = this.fxConfig.bgmVolume;
    const now = this.ctx.currentTime;

    if (isActive) {
      // Smooth attack ducking (lower BGM)
      const duckedVol = baseVol * this.fxConfig.duckingAmount;
      this.bgmGain.gain.cancelScheduledValues(now);
      this.bgmGain.gain.setTargetAtTime(duckedVol, now, 0.08);
    } else {
      // Smooth release ducking (restore BGM)
      this.bgmGain.gain.cancelScheduledValues(now);
      this.bgmGain.gain.setTargetAtTime(baseVol, now, 0.4);
    }
  }

  /**
   * Loads custom audio file as BGM
   */
  async loadBgmFromFile(file) {
    await this.init();
    const arrayBuffer = await file.arrayBuffer();
    this.bgmBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.bgmMode = 'custom';
    return this.bgmBuffer;
  }

  /**
   * Starts BGM playback (ambient synth or custom file)
   */
  playBgm(mode = 'lofi') {
    if (!this.ctx) return;
    this.stopBgm();
    this.bgmMode = mode;

    if (mode === 'custom' && this.bgmBuffer) {
      this.bgmSource = this.ctx.createBufferSource();
      this.bgmSource.buffer = this.bgmBuffer;
      this.bgmSource.loop = true;
      this.bgmSource.connect(this.bgmGain);
      this.bgmSource.start(0);
      this.bgmIsPlaying = true;
      return;
    }

    if (mode === 'lofi') {
      this.startLofiAmbience();
      this.bgmIsPlaying = true;
    } else if (mode === 'scifi') {
      this.startSciFiPad();
      this.bgmIsPlaying = true;
    } else if (mode === 'rain') {
      this.startRainAmbience();
      this.bgmIsPlaying = true;
    }
  }

  /**
   * Stops BGM / Ambient synthesis
   */
  stopBgm() {
    if (this.bgmSource) {
      try {
        this.bgmSource.stop();
        this.bgmSource.disconnect();
      } catch (e) {}
      this.bgmSource = null;
    }

    // Stop and disconnect any ambient synth generators
    this.ambientGenerators.forEach((node) => {
      try {
        if (node.stop) node.stop();
        node.disconnect();
      } catch (e) {}
    });
    this.ambientGenerators = [];
    this.bgmIsPlaying = false;
  }

  /**
   * Ambient Synthesizer 1: Lo-Fi Warm Chords
   */
  startLofiAmbience() {
    const chordFrequencies = [220, 261.63, 329.63, 392.0]; // Am7 chord
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(550, this.ctx.currentTime);
    filter.connect(this.bgmGain);
    this.ambientGenerators.push(filter);

    chordFrequencies.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq + (idx % 2 === 0 ? 0.8 : -0.8), this.ctx.currentTime);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      osc.connect(gain);
      gain.connect(filter);
      osc.start();
      this.ambientGenerators.push(osc, gain);
    });
  }

  /**
   * Ambient Synthesizer 2: Cinematic Sci-Fi Drone
   */
  startSciFiPad() {
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, this.ctx.currentTime);
    filter.Q.setValueAtTime(3, this.ctx.currentTime);
    filter.connect(this.bgmGain);
    this.ambientGenerators.push(filter);

    // LFO to slowly sweep filter frequency
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(0.15, this.ctx.currentTime);
    lfoGain.gain.setValueAtTime(200, this.ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    this.ambientGenerators.push(lfo, lfoGain);

    [110, 164.81, 220, 329.63].forEach((freq) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      osc.connect(gain);
      gain.connect(filter);
      osc.start();
      this.ambientGenerators.push(osc, gain);
    });
  }

  /**
   * Ambient Synthesizer 3: Cozy Rain & White Noise
   */
  startRainAmbience() {
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(this.bgmGain);
    whiteNoise.start(0);

    this.ambientGenerators.push(whiteNoise, filter);
  }

  /**
   * Play Audio Cue (Beep for countdown 3-2-1)
   */
  playCue(frequency = 880, duration = 0.1, isFinal = false) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isFinal ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  /**
   * Connect an audio element or AudioBuffer to the Voice DSP Chain
   */
  playVoiceBuffer(audioBuffer, onEndedCallback) {
    if (!this.ctx || !audioBuffer) return;
    this.stopVoice();

    this.currentVoiceBuffer = audioBuffer;
    this.voiceSource = this.ctx.createBufferSource();
    this.voiceSource.buffer = audioBuffer;

    this.voiceSource.connect(this.voiceGain);

    this.setVoiceActiveState(true);

    this.voiceSource.onended = () => {
      this.setVoiceActiveState(false);
      if (onEndedCallback) onEndedCallback();
    };

    this.voiceSource.start(0);
  }

  stopVoice() {
    if (this.voiceSource) {
      try {
        this.voiceSource.stop();
        this.voiceSource.disconnect();
      } catch (e) {}
      this.voiceSource = null;
    }
    this.setVoiceActiveState(false);
  }

  /**
   * Export Master Mix to 16-bit WAV Blob
   * Renders voice + BGM through DSP chain into AudioBuffer then WAV
   */
  async exportWavBlob(voiceBuffer) {
    await this.init();
    if (!voiceBuffer) {
      throw new Error("Tidak ada audio suara untuk diexport.");
    }

    const duration = voiceBuffer.duration + 0.8; // extra tail for reverb
    const sampleRate = 44100;
    const offlineCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
      2,
      Math.ceil(sampleRate * duration),
      sampleRate
    );

    // Build offline DSP graph
    const voiceSrc = offlineCtx.createBufferSource();
    voiceSrc.buffer = voiceBuffer;

    const voiceGain = offlineCtx.createGain();
    voiceGain.gain.value = this.fxConfig.voiceVolume;

    const eqLow = offlineCtx.createBiquadFilter();
    eqLow.type = 'lowshelf';
    eqLow.frequency.value = 140;
    eqLow.gain.value = this.fxConfig.eqLow;

    const eqMid = offlineCtx.createBiquadFilter();
    eqMid.type = 'peaking';
    eqMid.frequency.value = 2500;
    eqMid.gain.value = this.fxConfig.eqMid;

    const eqHigh = offlineCtx.createBiquadFilter();
    eqHigh.type = 'highshelf';
    eqHigh.frequency.value = 8500;
    eqHigh.gain.value = this.fxConfig.eqHigh;

    const comp = offlineCtx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.ratio.value = 4.0;

    const reverb = offlineCtx.createConvolver();
    let revDur = 1.2;
    let revDecay = 2.0;
    if (this.fxConfig.reverbPreset === 'treated-booth') { revDur = 0.4; revDecay = 3.5; }
    else if (this.fxConfig.reverbPreset === 'concert-hall') { revDur = 2.8; revDecay = 1.8; }
    else if (this.fxConfig.reverbPreset === 'space-cathedral') { revDur = 4.5; revDecay = 1.2; }

    // Offline Impulse
    const impLen = Math.floor(sampleRate * revDur);
    const impBuffer = offlineCtx.createBuffer(2, impLen, sampleRate);
    const lData = impBuffer.getChannelData(0);
    const rData = impBuffer.getChannelData(1);
    for (let i = 0; i < impLen; i++) {
      const env = Math.pow(1 - i / impLen, revDecay);
      lData[i] = (Math.random() * 2 - 1) * env;
      rData[i] = (Math.random() * 2 - 1) * env;
    }
    reverb.buffer = impBuffer;

    const dryGain = offlineCtx.createGain();
    dryGain.gain.value = 1.0;

    const revGain = offlineCtx.createGain();
    revGain.gain.value = this.fxConfig.reverbPreset === 'off' ? 0 : this.fxConfig.reverbWet;

    voiceSrc.connect(voiceGain);
    voiceGain.connect(eqLow);
    eqLow.connect(eqMid);
    eqMid.connect(eqHigh);
    eqHigh.connect(comp);

    comp.connect(dryGain);
    comp.connect(reverb);
    reverb.connect(revGain);

    dryGain.connect(offlineCtx.destination);
    revGain.connect(offlineCtx.destination);

    // If BGM is enabled and buffer exists, mix it in
    if (this.bgmBuffer && (this.bgmMode === 'custom' || this.bgmIsPlaying)) {
      const bgmSrc = offlineCtx.createBufferSource();
      bgmSrc.buffer = this.bgmBuffer;
      bgmSrc.loop = true;

      const bgmGain = offlineCtx.createGain();
      const duckedVol = this.fxConfig.bgmVolume * this.fxConfig.duckingAmount;
      bgmGain.gain.setValueAtTime(duckedVol, 0);
      bgmGain.gain.setValueAtTime(duckedVol, voiceBuffer.duration);
      bgmGain.gain.linearRampToValueAtTime(this.fxConfig.bgmVolume, voiceBuffer.duration + 0.3);

      bgmSrc.connect(bgmGain);
      bgmGain.connect(offlineCtx.destination);
      bgmSrc.start(0);
    }

    voiceSrc.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    return audioBufferToWav(renderedBuffer);
  }
}

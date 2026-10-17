/**
 * Main Application Orchestrator for VoxStudio Pro
 * Handles UI interactions, state management, audio graph connections,
 * script sequencing, take management, and export pipelines.
 */

import { AudioEngine } from './audio-engine.js';
import { TtsEngine, MALE_PERSONAS, FEMALE_PERSONAS, detectVoiceGender } from './tts-engine.js';
import { VoiceRecorder } from './recorder.js';
import { AudioVisualizer, WaveformCanvas } from './visualizer.js';
import { Teleprompter } from './teleprompter.js';

// Pre-packaged Script Templates
const SCRIPT_TEMPLATES = {
  pria_trailer: [
    {
      id: 'b1',
      speaker: 'Pria (Trailer)',
      text: 'Di tengah kegelapan yang melanda dunia... hanya satu pria yang berani bangkit melawan takdir.',
      rate: 0.85,
      pitch: 0.65,
      volume: 1.0,
      voiceURI: 'male:cinema'
    },
    {
      id: 'b2',
      speaker: 'Pria (Bariton)',
      text: '[pause 1.2s] Ketika semua harapan runtuh, keberanian sejati diuji sampai tetes darah terakhir.',
      rate: 0.9,
      pitch: 0.74,
      volume: 1.0,
      voiceURI: 'male:baritone'
    },
    {
      id: 'b3',
      speaker: 'Pria (Host)',
      text: '[pause 0.8s] Saksikan pertarungan terbesar tahun ini. Segera di bioskop.',
      rate: 0.95,
      pitch: 0.80,
      volume: 1.0,
      voiceURI: 'male:broadcaster'
    }
  ],
  dialog_pria_wanita: [
    {
      id: 'b1',
      speaker: 'Pria (Host)',
      text: 'Halo pemirsa! Selamat datang kembali di Suara Kreator bersama saya Rama.',
      rate: 1.0,
      pitch: 0.80,
      volume: 1.0,
      voiceURI: 'male:broadcaster'
    },
    {
      id: 'b2',
      speaker: 'Wanita (Co-Host)',
      text: '[pause 0.8s] Dan saya Cindy! Hari ini kita kedatangan topik spesial mengenai produksi voice over profesional.',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      voiceURI: 'female:natural'
    },
    {
      id: 'b3',
      speaker: 'Pria (Host)',
      text: '[pause 0.6s] Benar sekali Cindy, kita akan mendengarkan bagaimana modulasi suara laki-laki bariton memberikan kesan berwibawa.',
      rate: 0.98,
      pitch: 0.74,
      volume: 1.0,
      voiceURI: 'male:baritone'
    }
  ],
  kopi: [
    {
      id: 'b1',
      speaker: 'Pria (Bariton)',
      text: 'Pagi hari bukan sekadar membuka mata. Ini tentang menemukan semangat baru di setiap tegukan.',
      rate: 0.95,
      pitch: 0.74,
      volume: 1.0,
      voiceURI: 'male:baritone'
    },
    {
      id: 'b2',
      speaker: 'Pria (Bariton)',
      text: '[pause 1.0s] Kopi Nusantara, dipetik dari lereng pegunungan vulkanik dengan aroma yang kaya dan cita rasa autentik.',
      rate: 1.0,
      pitch: 0.74,
      volume: 1.0,
      voiceURI: 'male:baritone'
    },
    {
      id: 'b3',
      speaker: 'Pria (Muda)',
      text: '[pause 0.8s] Rasakan kehangatannya. Awali hari terbaikmu sekarang juga.',
      rate: 0.92,
      pitch: 0.86,
      volume: 1.0,
      voiceURI: 'male:energetic'
    }
  ],
  trailer: [
    {
      id: 'b1',
      speaker: 'Narator Trailer',
      text: 'Di kedalaman semesta yang tak terjamah manusia... ada rahasia purba yang terbangun kembali.',
      rate: 0.85,
      pitch: 0.8,
      volume: 1.0,
      voiceURI: ''
    },
    {
      id: 'b2',
      speaker: 'Narator Trailer',
      text: '[pause 1.5s] Saat bintang terakhir mulai meredup, takdir seluruh galaksi berada di tangan mereka.',
      rate: 0.85,
      pitch: 0.75,
      volume: 1.0,
      voiceURI: ''
    },
    {
      id: 'b3',
      speaker: 'Epic Voice',
      text: '[pause 1.0s] Bersiaplah. Pertarungan terbesar akan segera dimulai di bioskop terdekat.',
      rate: 0.8,
      pitch: 0.8,
      volume: 1.0,
      voiceURI: ''
    }
  ],
  podcast: [
    {
      id: 'b1',
      speaker: 'Host Podcast',
      text: 'Halo semuanya! Selamat datang kembali di Podcast Suara Kreator, tempat kita mengupas tuntas ide-ide luar biasa.',
      rate: 1.05,
      pitch: 1.05,
      volume: 1.0,
      voiceURI: ''
    },
    {
      id: 'b2',
      speaker: 'Host Podcast',
      text: '[pause 0.8s] Di episode kali ini, kita kedatangan tamu spesial yang berhasil membangun studio audio profesional dari kamar tidur!',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      voiceURI: ''
    },
    {
      id: 'b3',
      speaker: 'Host Podcast',
      text: '[pause 0.5s] Jangan lupa siapkan catatan dan kopi kalian, kita mulai sekarang!',
      rate: 1.05,
      pitch: 1.0,
      volume: 1.0,
      voiceURI: ''
    }
  ],
  edukasi: [
    {
      id: 'b1',
      speaker: 'Instruktur',
      text: 'Selamat datang di panduan praktis produksi voice over berstandar profesional.',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      voiceURI: ''
    },
    {
      id: 'b2',
      speaker: 'Instruktur',
      text: '[pause 1.0s] Pertama, perhatikan artikulasi dan kontrol pernapasan saat membaca kalimat panjang.',
      rate: 0.95,
      pitch: 1.0,
      volume: 1.0,
      voiceURI: ''
    },
    {
      id: 'b3',
      speaker: 'Instruktur',
      text: '[pause 0.5s] Kedua, gunakan efek kompresor dan equalizer untuk memberikan kehangatan vokal yang memikat pendengar.',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      voiceURI: ''
    }
  ],
  custom: [
    {
      id: 'b1',
      speaker: 'Narator',
      text: 'Tulis naskah voice over Anda di sini... Gunakan tombol di bawah untuk menyisipkan jeda.',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      voiceURI: ''
    }
  ]
};

class VoxStudioApp {
  constructor() {
    // Instantiate Audio and Core Modules
    this.audioEngine = new AudioEngine();
    this.ttsEngine = new TtsEngine();
    this.recorder = new VoiceRecorder(this.audioEngine);

    // Active Script State
    this.scriptBlocks = JSON.parse(JSON.stringify(SCRIPT_TEMPLATES.pria_trailer));
    this.langFilter = 'id';
    this.genderFilter = 'male';
    this.activeVoiceBuffer = null; // Buffer currently loaded in dock timeline
    this.isPlayingMaster = false;
    this.playbackTimerId = null;
    this.playbackStartTime = 0;

    // UI Cache
    this.elements = {};

    this.init();
  }

  async init() {
    this.cacheElements();
    this.setupVisualizers();
    this.setupEventListeners();
    this.setupTeleprompter();

    // Voice Engine Callback
    this.ttsEngine.onVoicesLoaded = (voices) => {
      this.populateVoiceSelectors();
    };

    this.ttsEngine.onVoiceStateChange = (isActive) => {
      this.audioEngine.setVoiceActiveState(isActive);
      if (this.elements.dockTrackStatus) {
        this.elements.dockTrackStatus.textContent = isActive
          ? 'Track: Memutar Naskah AI...'
          : 'Track: Siap';
      }
    };

    this.ttsEngine.onBlockStart = (block) => {
      this.highlightBlock(block.id, true);
    };

    this.ttsEngine.onBlockEnd = (block) => {
      this.highlightBlock(block.id, false);
    };

    this.ttsEngine.onFinished = () => {
      this.showToast('Pemutaran naskah AI selesai.');
    };

    // Recorder Callbacks
    this.setupRecorderCallbacks();

    // Render Initial Script
    this.renderScriptBlocks();
    this.updateStats();

    // Load voices if already cached
    setTimeout(() => {
      this.populateVoiceSelectors();
    }, 150);

    // Create a synthesized demo voice buffer for dock waveform so it immediately looks alive!
    this.generateDemoVoiceBuffer();
  }

  cacheElements() {
    this.elements = {
      projectName: document.getElementById('input-project-name'),
      // Tabs
      tabBtns: document.querySelectorAll('.nav-tab-btn'),
      tabContents: document.querySelectorAll('.tab-content'),
      // Script Editor
      templateSelect: document.getElementById('select-script-template'),
      langFilterSelect: document.getElementById('select-lang-filter'),
      genderFilterSelect: document.getElementById('select-gender-filter'),
      wordCountStat: document.getElementById('stat-word-count'),
      readTimeStat: document.getElementById('stat-read-time'),
      btnPlayFullScript: document.getElementById('btn-play-full-script'),
      btnStopScript: document.getElementById('btn-stop-script'),
      scriptBlocksContainer: document.getElementById('script-blocks-container'),
      btnAddBlock: document.getElementById('btn-add-block'),
      // Mic Console
      btnToggleRecord: document.getElementById('btn-toggle-record'),
      recordBtnIcon: document.getElementById('record-btn-icon'),
      recordTimer: document.getElementById('record-timer'),
      recordStatusLabel: document.getElementById('record-status-label'),
      vuFillBar: document.getElementById('vu-fill-bar'),
      vuClipLed: document.getElementById('vu-clip-led'),
      vuDbText: document.getElementById('vu-db-text'),
      sliderMicGain: document.getElementById('slider-mic-gain'),
      takesContainer: document.getElementById('takes-list-container'),
      // Teleprompter
      prompterViewport: document.getElementById('prompter-viewport'),
      prompterText: document.getElementById('prompter-text'),
      btnPrompterPlay: document.getElementById('btn-prompter-play'),
      btnPrompterReset: document.getElementById('btn-prompter-reset'),
      btnPrompterMirrorH: document.getElementById('btn-prompter-mirror-h'),
      sliderPrompterSpeed: document.getElementById('slider-prompter-speed'),
      sliderPrompterFont: document.getElementById('slider-prompter-font'),
      // DSP FX
      sliderEqLow: document.getElementById('slider-eq-low'),
      sliderEqMid: document.getElementById('slider-eq-mid'),
      sliderEqHigh: document.getElementById('slider-eq-high'),
      eqValLow: document.getElementById('eq-val-low'),
      eqValMid: document.getElementById('eq-val-mid'),
      eqValHigh: document.getElementById('eq-val-high'),
      selectReverbPreset: document.getElementById('select-reverb-preset'),
      sliderReverbWet: document.getElementById('slider-reverb-wet'),
      reverbWetVal: document.getElementById('reverb-wet-val'),
      sliderDelayTime: document.getElementById('slider-delay-time'),
      sliderDelayFeedback: document.getElementById('slider-delay-feedback'),
      sliderDelayWet: document.getElementById('slider-delay-wet'),
      delayTimeVal: document.getElementById('delay-time-val'),
      delayFbVal: document.getElementById('delay-fb-val'),
      delayMixVal: document.getElementById('delay-mix-val'),
      charPresetBtns: document.querySelectorAll('[data-preset]'),
      toggleDucking: document.getElementById('toggle-ducking'),
      sliderDuckingAmount: document.getElementById('slider-ducking-amount'),
      duckingVal: document.getElementById('ducking-val'),
      // BGM
      bgmCards: document.querySelectorAll('.bgm-preset-card'),
      inputBgmFile: document.getElementById('input-bgm-file'),
      bgmFilename: document.getElementById('bgm-custom-filename'),
      // Master Faders
      sliderMasterVoice: document.getElementById('slider-master-voice'),
      sliderMasterBgm: document.getElementById('slider-master-bgm'),
      sliderMasterOut: document.getElementById('slider-master-out'),
      labelFaderVoice: document.getElementById('label-fader-voice'),
      labelFaderBgm: document.getElementById('label-fader-bgm'),
      labelFaderMaster: document.getElementById('label-fader-master'),
      // Visualizer Canvas
      visCanvas: document.getElementById('master-visualizer-canvas'),
      btnVisSpectrum: document.getElementById('btn-vis-spectrum'),
      btnVisOscilloscope: document.getElementById('btn-vis-oscilloscope'),
      // Dock Timeline
      dockWaveformCanvas: document.getElementById('dock-waveform-canvas'),
      btnMasterPlay: document.getElementById('btn-master-play'),
      masterPlayIcon: document.getElementById('master-play-icon'),
      btnMasterStop: document.getElementById('btn-master-stop'),
      timecodeDisplay: document.getElementById('timecode-display'),
      dockTrackStatus: document.getElementById('dock-track-status'),
      btnTrimAudio: document.getElementById('btn-trim-audio'),
      // Header Actions
      btnSaveProject: document.getElementById('btn-save-project'),
      btnLoadProject: document.getElementById('btn-load-project'),
      inputImportProject: document.getElementById('input-import-project'),
      btnExportSrt: document.getElementById('btn-export-srt'),
      btnExportWav: document.getElementById('btn-export-wav'),
      // Toasts
      toastContainer: document.getElementById('toast-container')
    };
  }

  setupVisualizers() {
    this.masterVisualizer = new AudioVisualizer(this.elements.visCanvas, this.audioEngine);
    this.masterVisualizer.start();

    this.dockWaveform = new WaveformCanvas(this.elements.dockWaveformCanvas);
    this.dockWaveform.onSeek = (percent) => {
      if (this.activeVoiceBuffer) {
        const targetTime = percent * this.activeVoiceBuffer.duration;
        this.updateTimecode(targetTime);
      }
    };
  }

  setupTeleprompter() {
    this.teleprompter = new Teleprompter(
      this.elements.prompterViewport,
      this.elements.prompterText
    );
    this.teleprompter.setScript(this.scriptBlocks);
  }

  setupRecorderCallbacks() {
    this.recorder.onVuMeterUpdate = (db, peakDb, isClipping) => {
      // Map dB (-60 to 0) to 0% - 100%
      const pct = Math.max(0, Math.min(100, ((db + 60) / 60) * 100));
      this.elements.vuFillBar.style.width = `${pct}%`;
      this.elements.vuDbText.textContent = `${db.toFixed(1)} dB`;

      if (isClipping) {
        this.elements.vuClipLed.classList.add('clipped');
      } else {
        this.elements.vuClipLed.classList.remove('clipped');
      }
    };

    this.recorder.onTimerTick = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      const ms = Math.floor((seconds % 1) * 10);
      this.elements.recordTimer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${ms}`;
    };

    this.recorder.onRecordStateChanged = (state) => {
      if (state === 'countdown') {
        this.elements.recordStatusLabel.textContent = 'Persiapan... 3, 2, 1!';
        this.elements.recordStatusLabel.style.color = 'var(--accent-amber)';
      } else if (state === 'recording') {
        this.elements.btnToggleRecord.classList.add('is-recording');
        this.elements.recordStatusLabel.textContent = 'Merekam suara secara langsung...';
        this.elements.recordStatusLabel.style.color = 'var(--accent-rose)';
        this.teleprompter.start();
      } else if (state === 'processing') {
        this.elements.recordStatusLabel.textContent = 'Memproses rekaman audio...';
        this.teleprompter.pause();
      } else {
        this.elements.btnToggleRecord.classList.remove('is-recording');
        this.elements.recordStatusLabel.textContent = 'Klik untuk Mulai Merekam (Dengan Hitung Mundur 3s)';
        this.elements.recordStatusLabel.style.color = 'var(--text-muted)';
        this.teleprompter.pause();
      }
    };

    this.recorder.onTakeAdded = (take) => {
      this.renderTakesList();
      this.setActiveVoiceBuffer(take.audioBuffer, take.name);
      this.showToast(`Rekaman "${take.name}" berhasil disimpan dan dimuat ke Studio.`);
    };
  }

  setupEventListeners() {
    // Navigation Tabs
    this.elements.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-tab');
        this.elements.tabBtns.forEach(b => b.classList.remove('active'));
        this.elements.tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(targetId)?.classList.add('active');
        // Refresh canvas widths upon tab switch
        this.masterVisualizer.resizeCanvas();
        this.dockWaveform.resizeCanvas();
      });
    });

    // Template Selector
    this.elements.templateSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      if (SCRIPT_TEMPLATES[val]) {
        this.scriptBlocks = JSON.parse(JSON.stringify(SCRIPT_TEMPLATES[val]));
        this.renderScriptBlocks();
        this.teleprompter.setScript(this.scriptBlocks);
        this.updateStats();
        this.showToast(`Template "${e.target.options[e.target.selectedIndex].text}" dimuat.`);
      }
    });

    // Language Filter Selector
    this.elements.langFilterSelect.addEventListener('change', (e) => {
      this.langFilter = e.target.value;
      this.populateVoiceSelectors();
    });

    // Gender Voice Filter Selector
    if (this.elements.genderFilterSelect) {
      this.elements.genderFilterSelect.addEventListener('change', (e) => {
        this.genderFilter = e.target.value;
        this.populateVoiceSelectors();
        this.showToast(`Filter suara: ${e.target.options[e.target.selectedIndex].text}`);
      });
    }

    // Play Full Script TTS
    this.elements.btnPlayFullScript.addEventListener('click', async () => {
      await this.audioEngine.init();
      this.ttsEngine.playScript(this.scriptBlocks, 0, this.langFilter);
    });

    // Stop TTS
    this.elements.btnStopScript.addEventListener('click', () => {
      this.ttsEngine.stop();
      this.unhighlightAllBlocks();
      this.showToast('Pemutaran TTS dihentikan.');
    });

    // Add Block Button
    this.elements.btnAddBlock.addEventListener('click', () => {
      const newId = 'b_' + Date.now();
      this.scriptBlocks.push({
        id: newId,
        speaker: 'Narator',
        text: 'Tulis kalimat baru di sini...',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        voiceURI: ''
      });
      this.renderScriptBlocks();
      this.teleprompter.setScript(this.scriptBlocks);
      this.updateStats();
    });

    // Record Button
    this.elements.btnToggleRecord.addEventListener('click', async () => {
      if (this.recorder.isRecording) {
        await this.recorder.stopRecording();
      } else {
        await this.recorder.startRecording(true);
      }
    });

    // Mic Gain Slider
    this.elements.sliderMicGain.addEventListener('input', (e) => {
      this.recorder.setMicGain(parseFloat(e.target.value));
    });

    // Teleprompter Controls
    this.elements.btnPrompterPlay.addEventListener('click', () => {
      this.teleprompter.togglePlay();
      const isScroll = this.teleprompter.isScrolling;
      this.elements.btnPrompterPlay.innerHTML = isScroll
        ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    });

    this.elements.btnPrompterReset.addEventListener('click', () => {
      this.teleprompter.resetScroll();
    });

    this.elements.btnPrompterMirrorH.addEventListener('click', () => {
      const isMirrored = this.teleprompter.toggleMirrorH();
      this.elements.btnPrompterMirrorH.classList.toggle('active', isMirrored);
      this.showToast(isMirrored ? 'Mode Cermin Kaca Diaktifkan' : 'Mode Cermin Dimatikan');
    });

    this.elements.sliderPrompterSpeed.addEventListener('input', (e) => {
      this.teleprompter.setSpeed(parseInt(e.target.value, 10));
    });

    this.elements.sliderPrompterFont.addEventListener('input', (e) => {
      this.teleprompter.setFontSize(parseInt(e.target.value, 10));
    });

    // EQ Sliders
    const updateEQ = () => {
      const low = parseFloat(this.elements.sliderEqLow.value);
      const mid = parseFloat(this.elements.sliderEqMid.value);
      const high = parseFloat(this.elements.sliderEqHigh.value);
      this.elements.eqValLow.textContent = `${low > 0 ? '+' : ''}${low} dB`;
      this.elements.eqValMid.textContent = `${mid > 0 ? '+' : ''}${mid} dB`;
      this.elements.eqValHigh.textContent = `${high > 0 ? '+' : ''}${high} dB`;
      this.audioEngine.setEQ(low, mid, high);
    };
    this.elements.sliderEqLow.addEventListener('input', updateEQ);
    this.elements.sliderEqMid.addEventListener('input', updateEQ);
    this.elements.sliderEqHigh.addEventListener('input', updateEQ);

    // Reverb Controls
    this.elements.selectReverbPreset.addEventListener('change', (e) => {
      this.audioEngine.setReverbPreset(e.target.value);
      this.showToast(`Preset Reverb: ${e.target.options[e.target.selectedIndex].text}`);
    });

    this.elements.sliderReverbWet.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.elements.reverbWetVal.textContent = `${Math.round(val * 100)}%`;
      if (this.audioEngine.reverbWet && this.audioEngine.ctx) {
        this.audioEngine.reverbWet.gain.setValueAtTime(val, this.audioEngine.ctx.currentTime);
      }
    });

    // Delay Controls
    const updateDelay = () => {
      const time = parseFloat(this.elements.sliderDelayTime.value);
      const fb = parseFloat(this.elements.sliderDelayFeedback.value);
      const wet = parseFloat(this.elements.sliderDelayWet.value);
      this.elements.delayTimeVal.textContent = `${Math.round(time * 1000)} ms`;
      this.elements.delayFbVal.textContent = `${Math.round(fb * 100)}%`;
      this.elements.delayMixVal.textContent = `${Math.round(wet * 100)}%`;
      this.audioEngine.setDelay(time, fb, wet);
    };
    this.elements.sliderDelayTime.addEventListener('input', updateDelay);
    this.elements.sliderDelayFeedback.addEventListener('input', updateDelay);
    this.elements.sliderDelayWet.addEventListener('input', updateDelay);

    // Voice Character Presets
    this.elements.charPresetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.elements.charPresetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const preset = btn.getAttribute('data-preset');
        this.audioEngine.setCharacterFx(preset);
        this.showToast(`Karakter vokal diterapkan: ${btn.textContent.trim()}`);
      });
    });

    // Ducking Slider & Toggle
    this.elements.toggleDucking.addEventListener('change', (e) => {
      this.audioEngine.fxConfig.duckingEnabled = e.target.checked;
      this.showToast(e.target.checked ? 'Auto-Ducking Aktif' : 'Auto-Ducking Nonaktif');
    });

    this.elements.sliderDuckingAmount.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.audioEngine.fxConfig.duckingAmount = val;
      const dbDrop = Math.round(20 * Math.log10(val));
      this.elements.duckingVal.textContent = `${dbDrop} dB (${Math.round(val * 100)}%)`;
    });

    // BGM Cards
    this.elements.bgmCards.forEach(card => {
      card.addEventListener('click', async () => {
        await this.audioEngine.init();
        this.elements.bgmCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const mode = card.getAttribute('data-mode');
        if (mode === 'none') {
          this.audioEngine.stopBgm();
          this.showToast('BGM dimatikan.');
        } else {
          this.audioEngine.playBgm(mode);
          this.showToast(`BGM Ambience Aktif: ${card.querySelector('.bgm-card-title').textContent}`);
        }
      });
    });

    // Custom BGM file
    this.elements.inputBgmFile.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        this.elements.bgmFilename.textContent = `File: ${file.name}`;
        await this.audioEngine.loadBgmFromFile(file);
        this.elements.bgmCards.forEach(c => c.classList.remove('active'));
        this.audioEngine.playBgm('custom');
        this.showToast(`Musik kustom dimuat: ${file.name}`);
      }
    });

    // Master Faders
    this.elements.sliderMasterVoice.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.elements.labelFaderVoice.textContent = `${Math.round(val * 100)}%`;
      this.audioEngine.setVoiceVolume(val);
    });

    this.elements.sliderMasterBgm.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.elements.labelFaderBgm.textContent = `${Math.round(val * 100)}%`;
      this.audioEngine.setBgmVolume(val);
    });

    this.elements.sliderMasterOut.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.elements.labelFaderMaster.textContent = `${Math.round(val * 100)}%`;
      this.audioEngine.setMasterVolume(val);
    });

    // Visualizer Mode Switch
    this.elements.btnVisSpectrum.addEventListener('click', () => {
      this.elements.btnVisSpectrum.classList.add('active');
      this.elements.btnVisOscilloscope.classList.remove('active');
      this.masterVisualizer.setMode('spectrum');
    });

    this.elements.btnVisOscilloscope.addEventListener('click', () => {
      this.elements.btnVisOscilloscope.classList.add('active');
      this.elements.btnVisSpectrum.classList.remove('active');
      this.masterVisualizer.setMode('oscilloscope');
    });

    // Master Transport Dock (Play/Pause & Stop)
    this.elements.btnMasterPlay.addEventListener('click', () => {
      this.toggleMasterPlayback();
    });

    this.elements.btnMasterStop.addEventListener('click', () => {
      this.stopMasterPlayback();
    });

    this.elements.btnTrimAudio.addEventListener('click', () => {
      if (this.dockWaveform) {
        this.dockWaveform.trimStartPercent = 0.0;
        this.dockWaveform.trimEndPercent = 1.0;
        this.dockWaveform.draw();
        this.showToast('Titik potong (trim) direset penuh.');
      }
    });

    // Header Actions: Save / Load / Export
    this.elements.btnSaveProject.addEventListener('click', () => this.saveProject());
    this.elements.btnLoadProject.addEventListener('click', () => this.elements.inputImportProject.click());
    this.elements.inputImportProject.addEventListener('change', (e) => this.importProject(e));
    this.elements.btnExportSrt.addEventListener('click', () => this.exportSrt());
    this.elements.btnExportWav.addEventListener('click', () => this.exportMasterWav());

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      // Ignore if typing in text inputs
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        this.toggleMasterPlayback();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        this.elements.btnToggleRecord.click();
      } else if (e.code === 'Escape') {
        this.stopMasterPlayback();
        this.ttsEngine.stop();
      }
    });
  }

  /**
   * Generates a pleasant synthesized harmonic audio buffer for immediate dock timeline display
   */
  async generateDemoVoiceBuffer() {
    await this.audioEngine.init();
    const ctx = this.audioEngine.ctx;
    const sampleRate = ctx.sampleRate;
    const duration = 6.5; // seconds
    const buffer = ctx.createBuffer(2, sampleRate * duration, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    // Synthesize voice-like formant envelope pulses
    for (let i = 0; i < left.length; i++) {
      const t = i / sampleRate;
      // Multi-syllable speech modulation rhythm
      const envelope = Math.max(0, Math.sin(t * Math.PI * 2.5)) * Math.min(1, Math.exp(-((t % 0.8) * 3)));
      const voiceTone = (Math.sin(2 * Math.PI * 180 * t) + 0.5 * Math.sin(2 * Math.PI * 360 * t)) * envelope;
      left[i] = voiceTone * 0.4;
      right[i] = voiceTone * 0.4;
    }

    this.setActiveVoiceBuffer(buffer, 'Naskah AI (Demo Suara)');
  }

  setActiveVoiceBuffer(buffer, label = 'Track Vokal') {
    this.activeVoiceBuffer = buffer;
    if (this.dockWaveform) {
      this.dockWaveform.setAudioBuffer(buffer);
    }
    if (this.elements.dockTrackStatus) {
      this.elements.dockTrackStatus.textContent = `Track: ${label} (${buffer ? buffer.duration.toFixed(1) + 's' : 'Kosong'})`;
    }
  }

  toggleMasterPlayback() {
    if (this.isPlayingMaster) {
      this.stopMasterPlayback();
    } else {
      this.startMasterPlayback();
    }
  }

  async startMasterPlayback() {
    await this.audioEngine.init();

    if (this.activeVoiceBuffer) {
      this.isPlayingMaster = true;
      this.elements.btnMasterPlay.classList.add('playing');
      this.elements.masterPlayIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';

      const duration = this.activeVoiceBuffer.duration;
      this.playbackStartTime = performance.now();

      this.audioEngine.playVoiceBuffer(this.activeVoiceBuffer, () => {
        this.stopMasterPlayback();
      });

      if (this.playbackTimerId) cancelAnimationFrame(this.playbackTimerId);
      const loop = () => {
        if (!this.isPlayingMaster) return;
        const elapsed = (performance.now() - this.playbackStartTime) / 1000;
        this.updateTimecode(elapsed);
        const pct = Math.min(1.0, elapsed / duration);
        this.dockWaveform.setPlayhead(pct);

        if (elapsed < duration) {
          this.playbackTimerId = requestAnimationFrame(loop);
        }
      };
      this.playbackTimerId = requestAnimationFrame(loop);
    } else {
      // Fallback: Trigger TTS script play
      this.elements.btnPlayFullScript.click();
    }
  }

  stopMasterPlayback() {
    this.isPlayingMaster = false;
    this.audioEngine.stopVoice();
    if (this.playbackTimerId) {
      cancelAnimationFrame(this.playbackTimerId);
      this.playbackTimerId = null;
    }
    this.elements.btnMasterPlay.classList.remove('playing');
    this.elements.masterPlayIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
    this.updateTimecode(0);
    this.dockWaveform.setPlayhead(0);
  }

  updateTimecode(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    this.elements.timecodeDisplay.textContent =
      `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  }

  /**
   * Render Script Cards in Editor
   */
  renderScriptBlocks() {
    const container = this.elements.scriptBlocksContainer;
    container.innerHTML = '';

    this.scriptBlocks.forEach((block, index) => {
      const card = document.createElement('div');
      card.className = 'script-block-card';
      card.id = `block-card-${block.id}`;
      card.dataset.id = block.id;

      card.innerHTML = `
        <div class="block-card-header">
          <input type="text" class="speaker-badge-input" value="${this.escapeHtml(block.speaker)}" title="Nama Pengisi Suara / Karakter">
          <select class="select-custom block-voice-select" title="Pilih Suara Sintesis">
            <option value="">Pilih Suara...</option>
          </select>
          <div class="block-actions">
            <button class="btn-icon btn-preview-block" title="Dengarkan Baris Ini">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            </button>
            <button class="btn-icon btn-delete-block" title="Hapus Baris Ini">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
          </div>
        </div>

        <!-- Quick Voice Persona Switcher -->
        <div class="tag-buttons-group" style="margin-bottom: 8px;">
          <span style="font-size: 0.7rem; color: var(--text-muted); margin-right: 2px;">Pilihan Suara:</span>
          <button class="tag-btn tag-male btn-set-persona" data-uri="male:baritone" data-speaker="Pria (Bariton)" data-pitch="0.74" title="Suara pria dewasa berwibawa & hangat">🧔 Pria Bariton</button>
          <button class="tag-btn tag-male btn-set-persona" data-uri="male:energetic" data-speaker="Pria (Muda)" data-pitch="0.86" title="Suara pria muda energik untuk iklan">👨 Pria Muda</button>
          <button class="tag-btn tag-male btn-set-persona" data-uri="male:cinema" data-speaker="Pria (Trailer)" data-pitch="0.64" title="Deep bass sinematik movie trailer">🎬 Pria Cinema</button>
          <button class="tag-btn tag-male btn-set-persona" data-uri="male:broadcaster" data-speaker="Pria (Host)" data-pitch="0.80" title="Penyiar radio & podcast">🎙️ Pria Host</button>
          <button class="tag-btn tag-female btn-set-persona" data-uri="female:natural" data-speaker="Wanita (Natural)" data-pitch="1.0" title="Suara wanita studio natural">👩 Wanita</button>
        </div>

        <textarea class="block-textarea" placeholder="Ketik naskah di sini...">${this.escapeHtml(block.text)}</textarea>

        <div class="block-card-footer">
          <div class="tag-buttons-group">
            <span style="font-size: 0.7rem; color: var(--text-muted); margin-right: 4px;">Sisip Jeda:</span>
            <button class="tag-btn btn-tag-pause" data-pause="0.5">+ 0.5s</button>
            <button class="tag-btn btn-tag-pause" data-pause="1.0">+ 1.0s</button>
            <button class="tag-btn btn-tag-pause" data-pause="1.5">+ 1.5s</button>
          </div>

          <div class="slider-group-compact">
            <div class="slider-item">
              <label>Speed:</label>
              <input type="range" class="block-rate-slider" min="0.6" max="1.5" step="0.05" value="${block.rate}">
              <span class="rate-val" style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--accent-cyan);">${block.rate}x</span>
            </div>
            <div class="slider-item">
              <label>Pitch:</label>
              <input type="range" class="block-pitch-slider" min="0.6" max="1.4" step="0.05" value="${block.pitch}">
              <span class="pitch-val" style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--accent-purple);">${block.pitch}</span>
            </div>
          </div>
        </div>
      `;

      // Event Listeners for this Block
      const speakerInput = card.querySelector('.speaker-badge-input');
      speakerInput.addEventListener('input', (e) => {
        block.speaker = e.target.value;
        this.teleprompter.setScript(this.scriptBlocks);
      });

      const textarea = card.querySelector('.block-textarea');
      textarea.addEventListener('input', (e) => {
        block.text = e.target.value;
        this.updateStats();
        this.teleprompter.setScript(this.scriptBlocks);
      });

      // Insert pause tags
      card.querySelectorAll('.btn-tag-pause').forEach(pBtn => {
        pBtn.addEventListener('click', () => {
          const pauseVal = pBtn.getAttribute('data-pause');
          const tag = ` [pause ${pauseVal}s] `;
          const cursor = textarea.selectionStart;
          const textBefore = textarea.value.substring(0, cursor);
          const textAfter = textarea.value.substring(cursor);
          textarea.value = textBefore + tag + textAfter;
          block.text = textarea.value;
          this.updateStats();
          this.teleprompter.setScript(this.scriptBlocks);
          textarea.focus();
          textarea.selectionEnd = cursor + tag.length;
        });
      });

      // Sliders
      const rateSlider = card.querySelector('.block-rate-slider');
      const rateVal = card.querySelector('.rate-val');
      rateSlider.addEventListener('input', (e) => {
        block.rate = parseFloat(e.target.value);
        rateVal.textContent = `${block.rate}x`;
      });

      const pitchSlider = card.querySelector('.block-pitch-slider');
      const pitchVal = card.querySelector('.pitch-val');
      pitchSlider.addEventListener('input', (e) => {
        block.pitch = parseFloat(e.target.value);
        pitchVal.textContent = block.pitch;
      });

      // Quick Persona Buttons Listener
      card.querySelectorAll('.btn-set-persona').forEach(pBtn => {
        pBtn.addEventListener('click', () => {
          const uri = pBtn.getAttribute('data-uri');
          const speaker = pBtn.getAttribute('data-speaker');
          const pitch = parseFloat(pBtn.getAttribute('data-pitch'));
          block.voiceURI = uri;
          block.speaker = speaker;
          block.pitch = pitch;

          speakerInput.value = speaker;
          pitchSlider.value = pitch;
          pitchVal.textContent = pitch;

          const voiceSelect = card.querySelector('.block-voice-select');
          if (voiceSelect) voiceSelect.value = uri;

          this.teleprompter.setScript(this.scriptBlocks);
          this.showToast(`Karakter baris diubah: ${speaker}`);
        });
      });

      // Preview Button
      card.querySelector('.btn-preview-block').addEventListener('click', async () => {
        await this.audioEngine.init();
        this.ttsEngine.previewBlock(block, this.langFilter);
      });

      // Delete Button
      card.querySelector('.btn-delete-block').addEventListener('click', () => {
        if (this.scriptBlocks.length <= 1) {
          this.showToast('Minimal harus ada satu baris naskah.');
          return;
        }
        this.scriptBlocks.splice(index, 1);
        this.renderScriptBlocks();
        this.populateVoiceSelectors();
        this.teleprompter.setScript(this.scriptBlocks);
        this.updateStats();
      });

      container.appendChild(card);
    });

    this.populateVoiceSelectors();
  }

  /**
   * Populate Voice Dropdowns filtered by active language and gender with Optgroups
   */
  populateVoiceSelectors() {
    const filterResult = this.ttsEngine.getVoicesByFilter({
      langCode: this.langFilter,
      genderFilter: this.genderFilter
    });

    const selects = document.querySelectorAll('.block-voice-select');

    selects.forEach(select => {
      const card = select.closest('.script-block-card');
      const blockId = card?.dataset.id;
      const block = this.scriptBlocks.find(b => b.id === blockId);

      select.innerHTML = '';

      // 1. Male Personas (AI Studio)
      const malePersonas = filterResult.personas.filter(p => p.gender === 'male');
      if (malePersonas.length > 0) {
        const maleGroup = document.createElement('optgroup');
        maleGroup.label = '🧔 Suara Laki-laki / Pria (AI Studio)';
        malePersonas.forEach(persona => {
          const opt = document.createElement('option');
          opt.value = persona.uri;
          opt.textContent = persona.name;
          if (block && block.voiceURI === persona.uri) {
            opt.selected = true;
          }
          maleGroup.appendChild(opt);
        });
        select.appendChild(maleGroup);
      }

      // 2. Female Personas (AI Studio)
      const femalePersonas = filterResult.personas.filter(p => p.gender === 'female');
      if (femalePersonas.length > 0) {
        const femaleGroup = document.createElement('optgroup');
        femaleGroup.label = '👩 Suara Perempuan / Wanita (AI Studio)';
        femalePersonas.forEach(persona => {
          const opt = document.createElement('option');
          opt.value = persona.uri;
          opt.textContent = persona.name;
          if (block && block.voiceURI === persona.uri) {
            opt.selected = true;
          }
          femaleGroup.appendChild(opt);
        });
        select.appendChild(femaleGroup);
      }

      // 3. Native Browser Voices
      if (filterResult.nativeVoices.length > 0) {
        const sysGroup = document.createElement('optgroup');
        sysGroup.label = '🎙️ Suara Sistem (OS / Browser)';
        filterResult.nativeVoices.forEach(voice => {
          const detectedGender = detectVoiceGender(voice);
          const icon = detectedGender === 'male' ? '🧔 ' : (detectedGender === 'female' ? '👩 ' : '🎙️ ');
          const opt = document.createElement('option');
          opt.value = voice.voiceURI;
          opt.textContent = `${icon}${voice.name} (${voice.lang})`;
          if (block && block.voiceURI === voice.voiceURI) {
            opt.selected = true;
          }
          sysGroup.appendChild(opt);
        });
        select.appendChild(sysGroup);
      }

      // Fallback if nothing selected
      if (block && !block.voiceURI) {
        block.voiceURI = this.genderFilter === 'female' ? 'female:natural' : 'male:baritone';
        select.value = block.voiceURI;
      } else if (block && block.voiceURI) {
        select.value = block.voiceURI;
      }

      select.onchange = (e) => {
        if (!block) return;
        block.voiceURI = e.target.value;
        const maleP = MALE_PERSONAS.find(p => p.uri === block.voiceURI);
        if (maleP) {
          block.speaker = maleP.speakerTag;
          block.pitch = maleP.pitchFactor;
          const speakerInp = card.querySelector('.speaker-badge-input');
          const pitchSl = card.querySelector('.block-pitch-slider');
          const pitchV = card.querySelector('.pitch-val');
          if (speakerInp) speakerInp.value = maleP.speakerTag;
          if (pitchSl) pitchSl.value = maleP.pitchFactor;
          if (pitchV) pitchV.textContent = maleP.pitchFactor;
          this.teleprompter.setScript(this.scriptBlocks);
        }
      };
    });
  }

  /**
   * Highlight active block during speech playback
   */
  highlightBlock(blockId, isActive) {
    const card = document.getElementById(`block-card-${blockId}`);
    if (card) {
      if (isActive) {
        card.classList.add('is-active-speaker');
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        card.classList.remove('is-active-speaker');
      }
    }
  }

  unhighlightAllBlocks() {
    document.querySelectorAll('.script-block-card').forEach(c => {
      c.classList.remove('is-active-speaker');
    });
  }

  /**
   * Recalculate Word Count and Estimated Read Time
   */
  updateStats() {
    let totalWords = 0;
    this.scriptBlocks.forEach(b => {
      // Clean tags like [pause 1s]
      const clean = b.text.replace(/\[pause\s*(\d+(\.\d+)?)s?\]/gi, '');
      const words = clean.trim().split(/\s+/).filter(w => w.length > 0);
      totalWords += words.length;
    });

    this.elements.wordCountStat.textContent = totalWords;

    // Average reading speed: ~130 words per minute
    const readSecs = Math.ceil((totalWords / 130) * 60);
    const m = Math.floor(readSecs / 60);
    const s = readSecs % 60;
    this.elements.readTimeStat.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  /**
   * Render Multi-Take recordings list
   */
  renderTakesList() {
    const container = this.elements.takesContainer;
    container.innerHTML = '';

    if (this.recorder.takes.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 12px;">
          Belum ada rekaman suara. Tekan tombol rekam di atas.
        </div>
      `;
      return;
    }

    this.recorder.takes.forEach(take => {
      const isAct = take.id === this.recorder.activeTakeId;
      const item = document.createElement('div');
      item.className = `take-item ${isAct ? 'active' : ''}`;

      item.innerHTML = `
        <div class="take-info">
          <span style="font-size: 1.1rem;">🎙️</span>
          <div>
            <div class="take-name">${this.escapeHtml(take.name)}</div>
            <div class="take-duration">${take.duration.toFixed(1)}s • ${take.timestamp}</div>
          </div>
        </div>

        <div style="display: flex; gap: 6px;">
          <button class="btn-icon btn-use-take" title="Gunakan di Studio Master">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
          </button>
          <button class="btn-icon btn-download-take" title="Download Audio Mentah">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
          </button>
          <button class="btn-icon btn-del-take" title="Hapus Take">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        </div>
      `;

      item.querySelector('.btn-use-take').addEventListener('click', () => {
        this.recorder.activeTakeId = take.id;
        this.renderTakesList();
        this.setActiveVoiceBuffer(take.audioBuffer, take.name);
        this.showToast(`"${take.name}" sekarang aktif di Studio.`);
      });

      item.querySelector('.btn-download-take').addEventListener('click', () => {
        const a = document.createElement('a');
        a.href = take.url;
        a.download = `${take.name.toLowerCase().replace(/\s+/g, '_')}.webm`;
        a.click();
      });

      item.querySelector('.btn-del-take').addEventListener('click', () => {
        this.recorder.deleteTake(take.id);
        this.renderTakesList();
        const activeTake = this.recorder.getActiveTake();
        if (activeTake) {
          this.setActiveVoiceBuffer(activeTake.audioBuffer, activeTake.name);
        }
      });

      container.appendChild(item);
    });
  }

  /**
   * Export Master Mix to Lossless WAV
   */
  async exportMasterWav() {
    try {
      this.showToast('Memproses audio master WAV...');
      const buffer = this.activeVoiceBuffer;
      if (!buffer) {
        this.showToast('Rekam suara atau pilih take terlebih dahulu untuk diexport.');
        return;
      }

      const wavBlob = await this.audioEngine.exportWavBlob(buffer);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      const projName = (this.elements.projectName.value || 'voiceover').toLowerCase().replace(/\s+/g, '_');
      a.href = url;
      a.download = `${projName}_master.wav`;
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('Master WAV berhasil didownload!');
    } catch (err) {
      console.error(err);
      this.showToast('Gagal mengexport WAV: ' + err.message);
    }
  }

  /**
   * Export SRT Subtitles with calculated timecodes
   */
  exportSrt() {
    let srtText = '';
    let currentTime = 0; // seconds

    this.scriptBlocks.forEach((block, idx) => {
      const clean = block.text.replace(/\[pause\s*(\d+(\.\d+)?)s?\]/gi, '');
      const words = clean.trim().split(/\s+/).filter(w => w.length > 0);
      const duration = Math.max(1.8, (words.length / 130) * 60);

      const startTime = currentTime;
      const endTime = currentTime + duration;
      currentTime = endTime + 0.4; // natural gap

      srtText += `${idx + 1}\n`;
      srtText += `${this.formatSrtTime(startTime)} --> ${this.formatSrtTime(endTime)}\n`;
      srtText += `[${block.speaker}] ${clean.trim()}\n\n`;
    });

    const blob = new Blob([srtText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const projName = (this.elements.projectName.value || 'voiceover').toLowerCase().replace(/\s+/g, '_');
    a.href = url;
    a.download = `${projName}_subtitles.srt`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('File Subtitle .SRT berhasil didownload!');
  }

  formatSrtTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }

  /**
   * Save & Import Project JSON
   */
  saveProject() {
    const project = {
      name: this.elements.projectName.value,
      version: '1.0',
      timestamp: new Date().toISOString(),
      scriptBlocks: this.scriptBlocks,
      fxConfig: this.audioEngine.fxConfig
    };

    const jsonStr = JSON.stringify(project, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = (project.name || 'proyek').toLowerCase().replace(/\s+/g, '_');
    a.href = url;
    a.download = `${safeName}.voxproj`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Proyek berhasil disimpan (.voxproj)!');
  }

  async importProject(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const proj = JSON.parse(text);
      if (proj.scriptBlocks && Array.isArray(proj.scriptBlocks)) {
        this.elements.projectName.value = proj.name || 'Proyek Diimpor';
        this.scriptBlocks = proj.scriptBlocks;
        this.renderScriptBlocks();
        this.teleprompter.setScript(this.scriptBlocks);
        this.updateStats();
        this.showToast(`Proyek "${proj.name || file.name}" berhasil diimpor!`);
      } else {
        throw new Error('Format file proyek tidak valid.');
      }
    } catch (err) {
      alert('Gagal membuka file proyek: ' + err.message);
    }
    event.target.value = '';
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-item';
    toast.textContent = message;
    this.elements.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = '0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Boot application upon DOM ready
window.addEventListener('DOMContentLoaded', () => {
  window.app = new VoxStudioApp();
});

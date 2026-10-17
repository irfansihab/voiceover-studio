/**
 * Text-to-Speech Engine with Advanced Voice Profiles & Gender Modeling
 * Interfaces with Web Speech API (SpeechSynthesis), handles multi-scene script sequencing,
 * language filtering, male/female gender detection & synthetic male persona modulation,
 * word-by-word karaoke highlighting, and pause tag parsing [pause 1.5s].
 */

export const MALE_PERSONAS = [
  {
    uri: 'male:baritone',
    name: '🧔 Pria Bariton (Berwibawa & Dalam)',
    speakerTag: 'Pria (Bariton)',
    gender: 'male',
    pitchFactor: 0.74,
    rateFactor: 0.95,
    eq: { low: 5.0, mid: 1.0, high: 2.0 },
    description: 'Suara pria dewasa berwibawa, mantap untuk narasi resmi & company profile.'
  },
  {
    uri: 'male:energetic',
    name: '👨 Pria Muda (Energik & Komersial)',
    speakerTag: 'Pria (Muda)',
    gender: 'male',
    pitchFactor: 0.86,
    rateFactor: 1.08,
    eq: { low: 2.5, mid: 2.0, high: 3.5 },
    description: 'Suara pria muda dinamis untuk iklan produk, podcast, dan medsos.'
  },
  {
    uri: 'male:cinema',
    name: '🎬 Pria Trailer Bioskop (Deep Bass Sinematik)',
    speakerTag: 'Pria (Trailer)',
    gender: 'male',
    pitchFactor: 0.64,
    rateFactor: 0.82,
    eq: { low: 8.0, mid: 1.5, high: 2.5 },
    description: 'Suara bass berat khas narator trailer film Hollywood dan game aksi.'
  },
  {
    uri: 'male:broadcaster',
    name: '🎙️ Pria Penyiar Radio & Podcast (Radio Host)',
    speakerTag: 'Pria (Host)',
    gender: 'male',
    pitchFactor: 0.80,
    rateFactor: 1.02,
    eq: { low: 4.5, mid: 2.5, high: 3.0 },
    description: 'Artikulasi renyah dan hangat khas penyiar radio profesional.'
  },
  {
    uri: 'male:wise',
    name: '👴 Pria Bijak / Senior (Narator Dokumenter)',
    speakerTag: 'Pria (Senior)',
    gender: 'male',
    pitchFactor: 0.69,
    rateFactor: 0.86,
    eq: { low: 4.0, mid: 0.5, high: 1.5 },
    description: 'Tempo tenang dan berwibawa, cocok untuk kisah sejarah & dokumenter.'
  }
];

export const FEMALE_PERSONAS = [
  {
    uri: 'female:natural',
    name: '👩 Wanita Natural (Studio Lembut)',
    speakerTag: 'Wanita (Natural)',
    gender: 'female',
    pitchFactor: 1.0,
    rateFactor: 1.0,
    eq: { low: 0, mid: 1.5, high: 2.5 },
    description: 'Suara wanita jernih dan ramah untuk berbagai kebutuhan konten.'
  },
  {
    uri: 'female:energetic',
    name: '👧 Wanita Ceria (Iklan & Promo)',
    speakerTag: 'Wanita (Ceria)',
    gender: 'female',
    pitchFactor: 1.15,
    rateFactor: 1.08,
    eq: { low: -1.0, mid: 3.0, high: 4.0 },
    description: 'Antusias, bersemangat, dan menarik perhatian untuk iklan.'
  },
  {
    uri: 'female:professional',
    name: '👩‍💼 Wanita Profesional (Berita & Presentasi)',
    speakerTag: 'Wanita (Pro)',
    gender: 'female',
    pitchFactor: 0.98,
    rateFactor: 0.96,
    eq: { low: 1.0, mid: 2.0, high: 2.0 },
    description: 'Artikulasi tegas dan formal untuk berita dan e-learning.'
  }
];

export function detectVoiceGender(voice) {
  if (!voice) return 'unknown';
  const name = `${voice.name} ${voice.voiceURI || ''}`.toLowerCase();

  const femaleKeywords = [
    'female', 'wanita', 'perempuan', 'woman', 'girl', 'damayanti', 'gadis', 'samantha',
    'karen', 'victoria', 'veena', 'zira', 'fiona', 'moira', 'tessa', 'yuna', 'satu',
    'ava', 'allison', 'kathy', 'susan', 'zoe', 'claire', 'alice', 'anna', 'helena',
    'siri voice 2', 'siri voice 4', 'sara', 'sarah', 'laura', 'maria', 'monica'
  ];

  const maleKeywords = [
    'male', 'pria', 'laki', 'man', 'boy', 'alex', 'daniel', 'david', 'george', 'james',
    'fred', 'thomas', 'arthur', 'rishi', 'oliver', 'ardi', 'andika', 'guy', 'brian',
    'russell', 'michael', 'paul', 'alva', 'albert', 'tom', 'mark', 'bruce', 'lee',
    'reed', 'rocko', 'shelley', 'vic', 'yuri', 'diego', 'jorge', 'carlos', 'juan',
    'mario', 'luca', 'stefan', 'martin', 'nathan', 'richard', 'charles', 'edward',
    'william', 'henry', 'steven', 'kevin', 'jason', 'aaron', 'alan', 'ian', 'adam',
    'siri voice 1', 'siri voice 3', 'evan', 'gopal'
  ];

  for (const kw of femaleKeywords) {
    if (name.includes(kw)) return 'female';
  }
  for (const kw of maleKeywords) {
    if (name.includes(kw)) return 'male';
  }
  return 'neutral';
}

export class TtsEngine {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.isPlaying = false;
    this.isPaused = false;
    this.currentUtterance = null;
    this.activeBlockIndex = -1;
    this.playbackQueue = [];
    this.abortController = false;

    // Callbacks
    this.onBlockStart = null;
    this.onBlockEnd = null;
    this.onWordBoundary = null;
    this.onFinished = null;
    this.onVoiceStateChange = null;

    this.initVoices();
  }

  /**
   * Initializes browser voices list and handles asynchronous voice loading
   */
  initVoices() {
    if (!this.synth) return;

    const load = () => {
      this.voices = this.synth.getVoices();
      if (this.onVoicesLoaded) {
        this.onVoicesLoaded(this.voices);
      }
    };

    load();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = load;
    }
  }

  /**
   * Get filtered list of voices by language category and gender
   */
  getVoicesByFilter({ langCode = 'all', genderFilter = 'all' } = {}) {
    if (!this.voices || this.voices.length === 0) {
      this.voices = this.synth ? this.synth.getVoices() : [];
    }

    let langFiltered = this.voices;
    if (langCode === 'id') {
      langFiltered = this.voices.filter(v => v.lang.toLowerCase().startsWith('id'));
    } else if (langCode === 'en') {
      langFiltered = this.voices.filter(v => v.lang.toLowerCase().startsWith('en'));
    } else if (langCode !== 'all') {
      langFiltered = this.voices.filter(v => v.lang.toLowerCase().startsWith(langCode.toLowerCase()));
    }

    // Filter native voices by gender
    let resultVoices = langFiltered;
    if (genderFilter === 'male') {
      resultVoices = langFiltered.filter(v => detectVoiceGender(v) === 'male');
    } else if (genderFilter === 'female') {
      resultVoices = langFiltered.filter(v => detectVoiceGender(v) === 'female');
    }

    // Curate Virtual Personas according to gender filter
    let personas = [];
    if (genderFilter === 'male' || genderFilter === 'all') {
      personas = personas.concat(MALE_PERSONAS);
    }
    if (genderFilter === 'female' || genderFilter === 'all') {
      personas = personas.concat(FEMALE_PERSONAS);
    }

    return {
      personas,
      nativeVoices: resultVoices,
      allNativeVoices: langFiltered
    };
  }

  /**
   * Resolves a voice selection and effective pitch/rate
   */
  resolveVoiceAndPitch(voiceURI, basePitch = 1.0, baseRate = 1.0, currentLang = 'id') {
    // Check if it's a virtual persona (e.g. 'male:baritone')
    const malePersona = MALE_PERSONAS.find(p => p.uri === voiceURI);
    if (malePersona) {
      const baseVoice = this.findBaseVoiceForLang(currentLang);
      return {
        voice: baseVoice,
        pitch: Math.max(0.5, Math.min(2.0, basePitch * malePersona.pitchFactor)),
        rate: Math.max(0.5, Math.min(2.0, baseRate * malePersona.rateFactor)),
        persona: malePersona
      };
    }

    const femalePersona = FEMALE_PERSONAS.find(p => p.uri === voiceURI);
    if (femalePersona) {
      const baseVoice = this.findBaseVoiceForLang(currentLang);
      return {
        voice: baseVoice,
        pitch: Math.max(0.5, Math.min(2.0, basePitch * femalePersona.pitchFactor)),
        rate: Math.max(0.5, Math.min(2.0, baseRate * femalePersona.rateFactor)),
        persona: femalePersona
      };
    }

    // Standard native voice
    let voice = this.voices.find(v => v.voiceURI === voiceURI);
    if (!voice) {
      voice = this.findBaseVoiceForLang(currentLang);
    }

    return {
      voice,
      pitch: basePitch,
      rate: baseRate,
      persona: null
    };
  }

  findBaseVoiceForLang(lang = 'id') {
    if (!this.voices || this.voices.length === 0) return null;
    return this.voices.find(v => v.lang.toLowerCase().startsWith(lang.toLowerCase())) ||
           this.voices.find(v => v.lang.toLowerCase().startsWith('id')) ||
           this.voices[0];
  }

  /**
   * Parse text containing tags like [pause 1.5s] or [pause 2s] into sub-tokens
   */
  parseScriptText(text) {
    const regex = /\[pause\s*(\d+(\.\d+)?)s?\]/gi;
    const tokens = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({
          type: 'text',
          content: text.substring(lastIndex, match.index).trim()
        });
      }
      tokens.push({
        type: 'pause',
        duration: parseFloat(match[1]) || 1.0
      });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      const remaining = text.substring(lastIndex).trim();
      if (remaining) {
        tokens.push({
          type: 'text',
          content: remaining
        });
      }
    }

    return tokens.length > 0 ? tokens : [{ type: 'text', content: text }];
  }

  /**
   * Speaks a single utterance promise-wrapped
   */
  speakToken(text, voice, rate = 1.0, pitch = 1.0, volume = 1.0, onBoundary) {
    return new Promise((resolve) => {
      if (this.abortController) {
        resolve();
        return;
      }

      if (!text || text.trim().length === 0) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      if (voice) utterance.voice = voice;
      utterance.rate = Math.max(0.5, Math.min(2.0, rate));
      utterance.pitch = Math.max(0.5, Math.min(2.0, pitch));
      utterance.volume = Math.max(0.0, Math.min(1.0, volume));

      utterance.onboundary = (event) => {
        if (onBoundary && event.name === 'word') {
          onBoundary(event.charIndex, event.charLength || 5);
        }
      };

      utterance.onend = () => {
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = (err) => {
        if (err.error === 'interrupted' || err.error === 'canceled') {
          resolve();
        } else {
          console.warn('SpeechSynthesis error:', err);
          resolve();
        }
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    });
  }

  /**
   * Sleep delay helper for pauses
   */
  waitDelay(seconds) {
    return new Promise(resolve => {
      if (this.abortController) {
        resolve();
        return;
      }
      setTimeout(resolve, seconds * 1000);
    });
  }

  /**
   * Play full script blocks sequentially
   */
  async playScript(blocks, startIndex = 0, currentLang = 'id') {
    if (!this.synth) return;
    this.stop();
    this.abortController = false;
    this.isPlaying = true;

    if (this.onVoiceStateChange) this.onVoiceStateChange(true);

    for (let i = startIndex; i < blocks.length; i++) {
      if (this.abortController) break;

      const block = blocks[i];
      this.activeBlockIndex = i;

      if (this.onBlockStart) this.onBlockStart(block, i);

      // Resolve voice and pitch with persona support
      const resolved = this.resolveVoiceAndPitch(
        block.voiceURI,
        block.pitch,
        block.rate,
        currentLang
      );

      // Parse tags
      const tokens = this.parseScriptText(block.text);

      for (const token of tokens) {
        if (this.abortController) break;

        if (token.type === 'pause') {
          await this.waitDelay(token.duration);
        } else if (token.type === 'text') {
          await this.speakToken(
            token.content,
            resolved.voice,
            resolved.rate,
            resolved.pitch,
            block.volume,
            (charIndex, charLen) => {
              if (this.onWordBoundary) {
                this.onWordBoundary(block.id, charIndex, charLen);
              }
            }
          );
        }
      }

      if (this.onBlockEnd) this.onBlockEnd(block, i);
      // Small natural breath gap between blocks
      await this.waitDelay(0.25);
    }

    this.isPlaying = false;
    this.activeBlockIndex = -1;
    if (this.onVoiceStateChange) this.onVoiceStateChange(false);
    if (this.onFinished) this.onFinished();
  }

  /**
   * Preview a single block immediately
   */
  async previewBlock(block, currentLang = 'id') {
    if (!this.synth) return;
    this.stop();
    this.abortController = false;
    this.isPlaying = true;

    if (this.onVoiceStateChange) this.onVoiceStateChange(true);
    if (this.onBlockStart) this.onBlockStart(block, 0);

    const resolved = this.resolveVoiceAndPitch(
      block.voiceURI,
      block.pitch,
      block.rate,
      currentLang
    );

    const tokens = this.parseScriptText(block.text);
    for (const token of tokens) {
      if (this.abortController) break;
      if (token.type === 'pause') {
        await this.waitDelay(token.duration);
      } else {
        await this.speakToken(
          token.content,
          resolved.voice,
          resolved.rate,
          resolved.pitch,
          block.volume,
          (charIndex, charLen) => {
            if (this.onWordBoundary) this.onWordBoundary(block.id, charIndex, charLen);
          }
        );
      }
    }

    this.isPlaying = false;
    if (this.onVoiceStateChange) this.onVoiceStateChange(false);
    if (this.onBlockEnd) this.onBlockEnd(block, 0);
  }

  /**
   * Pause playback
   */
  pause() {
    if (this.synth && this.isPlaying) {
      this.synth.pause();
      this.isPaused = true;
    }
  }

  /**
   * Resume playback
   */
  resume() {
    if (this.synth && this.isPaused) {
      this.synth.resume();
      this.isPaused = false;
    }
  }

  /**
   * Cancel and stop speech
   */
  stop() {
    this.abortController = true;
    if (this.synth) {
      this.synth.cancel();
    }
    this.isPlaying = false;
    this.isPaused = false;
    this.currentUtterance = null;
    this.activeBlockIndex = -1;
    if (this.onVoiceStateChange) this.onVoiceStateChange(false);
  }
}

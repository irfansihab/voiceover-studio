# VoxStudio Pro - Studio Voice Over & Audio AI Workstation

Aplikasi Voice Over Profesional modern dan interaktif dengan fitur lengkap, dirancang untuk kreator konten, podcaster, voice actor, dan tim produksi media.

---

## 🌟 Fitur Unggulan

### 1. 🤖 AI Script Editor & Text-to-Speech (TTS)
- **🧔 Pilihan Suara Laki-laki Lengkap (Male Personas & Deep Bass)**:
  - 🧔 **Pria Bariton Dewasa** (Pitch 0.74, hangat & berwibawa untuk company profile/narasi resmi).
  - 👨 **Pria Muda Energik** (Pitch 0.86, ceria & dinamis untuk iklan komersial & medsos).
  - 🎬 **Pria Trailer Bioskop** (Pitch 0.64, deep sub-bass sinematik ala film Hollywood & game).
  - 🎙️ **Pria Penyiar Radio & Podcast** (Pitch 0.80, artikulasi renyah & vokal padat).
  - 👴 **Pria Bijak / Senior** (Pitch 0.69, tempo tenang untuk kisah sejarah & dokumenter).
- **Filter Karakter Suara di Toolbar**: Opsi filter instan (*🧔 Khusus Suara Pria*, *👩 Suara Wanita*, dan *Semua Karakter*).
- **Tombol Pintas Persona per Baris**: Ubah baris dialog menjadi suara pria/wanita tertentu hanya dengan satu klik tombol badge.
- **Pengelompokan Suara Optgroup**: Dropdown suara otomatis memisahkan *Suara Pria (AI Studio)*, *Suara Wanita (AI Studio)*, dan *Suara Sistem Browser (Native Voices)* dengan ikon gender.
- **Dukungan Suara Luas**: Otomatis mendeteksi suara bawaan browser dengan filter Bahasa Indonesia (`id-ID`) dan Bahasa Inggris (`en-US`, `en-GB`, dll.).
- **Kontrol Akustik per Baris**: Pengaturan kecepatan baca (*Rate* 0.6x - 1.5x), tinggi nada (*Pitch*), dan volume.
- **Tag Jeda Cerdas**: Sisipkan jeda pernapasan natural seperti `[pause 0.5s]`, `[pause 1.0s]`, atau `[pause 1.5s]` dengan satu klik.
- **Highlighting Naskah Real-time**: Indikator visual neon menyala saat baris naskah sedang disuarakan.
- **Statistik Naskah**: Penghitung jumlah kata dan estimasi durasi baca otomatis berbasis standar industri (130 WPM).
- **Template Naskah Siap Pakai**:
  - 🧔 Trailer Sinematik (Suara Pria Bariton)
  - 🎭 Percakapan Dialog (Pria & Wanita)
  - ☕ Iklan Kopi Nusantara (Komersial)
  - 🎬 Trailer Film Sci-Fi (Epik & Sinematik)
  - 🎙️ Intro & Hook Podcast
  - 📚 Video Tutorial & Edukasi

### 2. 🎙️ Live Mic Studio & Multi-Take Booth
- **Perekam Audio Berkualitas Tinggi**: Merekam langsung dari mikrofon studio laptop atau USB audio interface.
- **Stereo VU Meter Real-Time**: Bar LED dinamis hijau-kuning-merah dengan indikator *Clip / Distorsi* dan pembacaan desibel (-60 dB hingga 0 dB).
- **Audio Cue Hitung Mundur 3 Detik**: Suara bip tempo persiapan (3... 2... 1... RECORD!) agar perekam siap tepat waktu.
- **Manajemen Multi-Take**: Simpan beberapa versi rekaman (Take 1, Take 2, Take 3) dengan durasi, preview, download audio mentah, dan pilihan *Gunakan di Studio Master*.

### 3. 📜 Smart Studio Teleprompter
- **Auto-Scrolling Halus**: Bergulir mulus berbasis `requestAnimationFrame` dengan kecepatan yang dapat disesuaikan (WPM / px per detik).
- **Mode Cermin Kaca (Mirror Flip)**: Membalik teks secara horizontal (`scaleX(-1)`) untuk kompatibilitas dengan perangkat kaca teleprompter profesional (*beam-splitter*).
- **Garis Panduan Fokus**: Highlighter bar horizontal di tengah viewport untuk memandu pandangan mata pembaca.
- **Pengatur Ukuran Font**: Kontrol ukuran teks yang fleksibel agar nyaman dibaca dari jarak jauh.

### 4. 🎛️ DSP Audio Effects Rack (Digital Signal Processing)
- **3-Band Parametric Equalizer**:
  - *Low Shelf (140Hz)*: Memberikan kehangatan dan ketebalan vokal (*warmth*).
  - *Peaking Mid (2.5kHz)*: Meningkatkan kejelasan artikulasi dan kehadiran vokal (*presence*).
  - *High Shelf (8.5kHz)*: Memberikan kilau udara vokal (*air & sparkle*).
- **Convolution Reverb Real-Time**: Mensimulasikan pantulan akustik ruangan dengan 4 preset:
  - *Treated Booth* (Bilik rekaman kedap suara)
  - *Warm Studio Room* (Ruang podcast intim)
  - *Concert Hall* (Aula megah untuk trailer)
  - *Space Cathedral* (Atmosfir kosmik luas)
- **Studio Echo & Delay**: Parameter *Delay Time*, *Feedback*, dan *Wet Mix*.
- **Preset Karakter Vokal Cepat**:
  - 🎙️ Alami (Studio)
  - 📻 Radio Host (Bass warm boost)
  - 🎬 Trailer Movie (Dinamika epik)
  - ☎️ Vintage Radio / Telepon (Bandpass filter 1.4kHz)
  - 🤫 ASMR Air Whisper (Kompresi intim dan treble boost)
- **Broadcast Compressor & Limiter**: Menjaga vokal tetap padat dan mencegah audio pecah/distorsi.
- **Auto-Ducking Cerdas**: Otomatis menurunkan volume Background Music (BGM) ketika vokal terdengar dan menaikkannya kembali saat hening.

### 5. 🎵 Background Music (BGM) & Sound Atmosphere
- **Generator Ambience Sintetis Prosedural**:
  - ☕ *Lo-Fi Chill Chords* (Akord Rhodes lembut)
  - 🌌 *Sci-Fi Ambient Drone* (Pad futuristik dengan filter sweep LFO)
  - 🌧️ *Rain & Cozy Ambience* (Suara hujan relaksasi)
- **Custom BGM Uploader**: Unggah musik latar milik sendiri (.mp3 / .wav) dengan integrasi auto-ducking.

### 6. ✂️ Interactive Waveform Timeline & Trimmer
- Visualisasi canvas waveform dinamis dari audio vokal yang aktif.
- Scrubbing posisi playback dengan klik langsung pada waveform.
- Penanda batas awal (*In-point*) dan akhir (*Out-point*) untuk trimming audio.
- Indikator Timecode presisi (`Menit:Detik.Milidetik`).

### 7. 💾 Export & Project Management Suite
- **Export Master WAV**: Render langsung seluruh track (Vokal + BGM + DSP FX) ke format lossless 16-bit 44.1kHz PCM WAV.
- **Export Subtitle .SRT**: Pembuatan file teks subtitle ber-timecode otomatis sesuai estimasi durasi tiap segmen naskah.
- **Simpan & Buka Proyek (.voxproj)**: Simpan seluruh naskah, nama proyek, dan konfigurasi FX ke file JSON untuk dibuka kembali kapan saja.

---

## 🚀 Cara Menjalankan & Mengakses

Server lokal saat ini sudah aktif pada:
```
http://localhost:8088/
```

Buka URL di atas pada browser pilihan Anda (Google Chrome, Safari, atau Microsoft Edge).

### Shortcut Keyboard:
- **Spasi**: Putar / Jeda Master Audio atau Naskah
- **R**: Mulai / Berhenti Merekam Mikrofon
- **Esc**: Hentikan Semua Pemutaran Audio

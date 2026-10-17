/**
 * Professional Studio Teleprompter Engine
 * Features smooth rAF scrolling, WPM speed regulation, mirror flip modes (for prompter glass),
 * focus reading guide, and font sizing.
 */

export class Teleprompter {
  constructor(containerEl, scrollContentEl) {
    this.container = containerEl;
    this.content = scrollContentEl;
    this.isScrolling = false;
    this.speed = 40; // pixels per second
    this.fontSize = 32; // px
    this.isMirroredH = false;
    this.isMirroredV = false;
    this.lastFrameTime = 0;
    this.animationId = null;

    this.onStateChange = null; // (isScrolling)
  }

  setScript(blocks) {
    if (!this.content) return;
    this.content.innerHTML = '';

    blocks.forEach((block, idx) => {
      const p = document.createElement('div');
      p.className = 'prompter-block';
      p.dataset.id = block.id;

      const speaker = document.createElement('div');
      speaker.className = 'prompter-speaker';
      speaker.textContent = `[${block.speaker || 'Voice'}]`;

      const text = document.createElement('div');
      text.className = 'prompter-text';
      // Clean up bracket tags like [pause 1s] for clean reading
      text.textContent = block.text.replace(/\[pause\s*(\d+(\.\d+)?)s?\]/gi, ' (Jeda $1d) ');

      p.appendChild(speaker);
      p.appendChild(text);
      this.content.appendChild(p);
    });

    this.resetScroll();
  }

  setFontSize(sizePx) {
    this.fontSize = sizePx;
    if (this.content) {
      this.content.style.fontSize = `${sizePx}px`;
    }
  }

  setSpeed(speedVal) {
    this.speed = Math.max(10, Math.min(200, speedVal));
  }

  toggleMirrorH() {
    this.isMirroredH = !this.isMirroredH;
    this.applyTransform();
    return this.isMirroredH;
  }

  toggleMirrorV() {
    this.isMirroredV = !this.isMirroredV;
    this.applyTransform();
    return this.isMirroredV;
  }

  applyTransform() {
    const scaleX = this.isMirroredH ? -1 : 1;
    const scaleY = this.isMirroredV ? -1 : 1;
    this.content.style.transform = `scale(${scaleX}, ${scaleY})`;
  }

  start() {
    if (this.isScrolling) return;
    this.isScrolling = true;
    this.lastFrameTime = performance.now();

    const loop = (time) => {
      if (!this.isScrolling) return;
      const deltaSec = (time - this.lastFrameTime) / 1000;
      this.lastFrameTime = time;

      if (this.container) {
        this.container.scrollTop += this.speed * deltaSec;
        // Stop if reached bottom
        if (this.container.scrollTop + this.container.clientHeight >= this.container.scrollHeight - 5) {
          this.pause();
          return;
        }
      }

      this.animationId = requestAnimationFrame(loop);
    };

    this.animationId = requestAnimationFrame(loop);
    if (this.onStateChange) this.onStateChange(true);
  }

  pause() {
    this.isScrolling = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.onStateChange) this.onStateChange(false);
  }

  togglePlay() {
    if (this.isScrolling) {
      this.pause();
    } else {
      this.start();
    }
  }

  resetScroll() {
    this.pause();
    if (this.container) {
      this.container.scrollTop = 0;
    }
  }
}

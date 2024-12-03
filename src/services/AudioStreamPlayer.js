export class AudioStreamPlayer {
    constructor() {
      this.audioMediaSource = null;
      this.audioSourceBuffer = null;
      this.audioElement = null;
      this.audioChunks = [];
      this.isPlayingAudio = false;
    }
  
    initialize() {
      this.audioMediaSource = new MediaSource();
      this.audioElement = new Audio();
      this.audioElement.src = URL.createObjectURL(this.audioMediaSource);
  
      this.audioMediaSource.addEventListener('sourceopen', () => {
        this.audioSourceBuffer = this.audioMediaSource.addSourceBuffer('audio/webm; codecs="opus"');
        this.audioSourceBuffer.mode = 'sequence';
        this.audioSourceBuffer.addEventListener('updateend', this.appendNextChunk.bind(this));
      });
    }
  
    handleAudioData(chunk) {
      if (!this.audioMediaSource) this.initialize();
      this.audioChunks.push(chunk);
      if (!this.audioSourceBuffer || this.audioSourceBuffer.updating) return;
      this.appendNextChunk();
    }
  
    appendNextChunk() {
      if (this.audioChunks.length === 0 || this.audioSourceBuffer.updating) return;
      const chunk = this.audioChunks.shift();
      this.audioSourceBuffer.appendBuffer(chunk);
      if (!this.isPlayingAudio) this.play();
    }
  
    async play() {
      if (this.isPlayingAudio) return;
      try {
        await this.audioElement.play();
        this.isPlayingAudio = true;
      } catch (error) {
        console.error('Error playing audio:', error);
        this.isPlayingAudio = false;
      }
    }
  
    stop() {
      if (this.audioElement) {
        this.audioElement.pause();
        this.audioElement.src = '';
        this.isPlayingAudio = false;
      }
      
      if (this.audioMediaSource) {
        if (this.audioMediaSource.readyState === 'open') {
          this.audioMediaSource.endOfStream();
        }
        this.audioMediaSource = null;
      }
      
      this.audioSourceBuffer = null;
      this.audioChunks = [];
    }
  }
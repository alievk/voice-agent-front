export class AudioStreamPlayer {
    constructor() {
      this.assistantAudioMediaSource = null;
      this.assistantAudioSourceBuffer = null;
      this.assistantAudioElement = null;
      this.assistantAudioChunks = [];
      this.isPlayingAssistantAudio = false;
    }
  
    initialize() {
      this.assistantAudioMediaSource = new MediaSource();
      this.assistantAudioElement = new Audio();
      this.assistantAudioElement.src = URL.createObjectURL(this.assistantAudioMediaSource);
  
      this.assistantAudioMediaSource.addEventListener('sourceopen', () => {
        this.assistantAudioSourceBuffer = this.assistantAudioMediaSource.addSourceBuffer('audio/webm; codecs="opus"');
        this.assistantAudioSourceBuffer.mode = 'sequence';
        this.assistantAudioSourceBuffer.addEventListener('updateend', this.appendNextChunk.bind(this));
      });
    }
  
    handleAudioData(chunk) {
      if (!this.assistantAudioMediaSource) this.initialize();
      this.assistantAudioChunks.push(chunk);
      if (!this.assistantAudioSourceBuffer || this.assistantAudioSourceBuffer.updating) return;
      this.appendNextChunk();
    }
  
    appendNextChunk() {
      if (this.assistantAudioChunks.length === 0 || this.assistantAudioSourceBuffer.updating) return;
      const chunk = this.assistantAudioChunks.shift();
      this.assistantAudioSourceBuffer.appendBuffer(chunk);
      if (!this.isPlayingAssistantAudio) this.play();
    }
  
    async play() {
      if (this.isPlayingAssistantAudio) return;
      try {
        await this.assistantAudioElement.play();
        this.isPlayingAssistantAudio = true;
      } catch (error) {
        console.error('Error playing assistant audio:', error);
        this.isPlayingAssistantAudio = false;
      }
    }
  
    stop() {
      if (this.assistantAudioElement) {
        this.assistantAudioElement.pause();
        this.assistantAudioElement.src = '';
        this.isPlayingAssistantAudio = false;
      }
      
      if (this.assistantAudioMediaSource) {
        if (this.assistantAudioMediaSource.readyState === 'open') {
          this.assistantAudioMediaSource.endOfStream();
        }
        this.assistantAudioMediaSource = null;
      }
      
      this.assistantAudioSourceBuffer = null;
      this.assistantAudioChunks = [];
    }
  }
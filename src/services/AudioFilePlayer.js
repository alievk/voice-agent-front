export class AudioFilePlayer {
    constructor() {
      this.audioContext = null;
      this.audioSource = null;
      this.audioRecorder = null;
      this.isPlaying = false;
    }
  
    async play(audioUrl, onDataAvailable, onEnded) {
      if (this.isPlaying) return;
  
      try {
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
  
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
  
        this.audioSource = this.audioContext.createBufferSource();
        this.audioSource.buffer = audioBuffer;
        this.audioSource.connect(this.audioContext.destination);
  
        const streamDestination = this.audioContext.createMediaStreamDestination();
        this.audioSource.connect(streamDestination);
  
        this.audioRecorder = new MediaRecorder(streamDestination.stream, { mimeType: 'audio/webm' });
        this.audioRecorder.ondataavailable = onDataAvailable;
        this.audioRecorder.start(100);
        
        this.audioSource.onended = () => {
          this.stop();
          onEnded?.();
        };
  
        this.audioSource.start(0);
        this.isPlaying = true;
      } catch (error) {
        console.error('Error playing audio:', error);
        throw error;
      }
    }
  
    stop() {
      if (this.audioSource) {
        this.audioSource.stop();
        this.audioSource.disconnect();
        this.audioSource = null;
      }
      if (this.audioRecorder) {
        this.audioRecorder.stop();
        this.audioRecorder = null;
      }
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close().catch(console.error);
      }
      this.isPlaying = false;
    }
  }
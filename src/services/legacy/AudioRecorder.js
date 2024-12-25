export class AudioRecorder {
    constructor() {
      this.recorder = null;
      this.isRecording = false;
    }
  
    async start(onDataAvailable) {
      if (this.isRecording) return;
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { 
            sampleRate: 16000, 
            channelCount: 1, 
            echoCancellation: false, 
            noiseSuppression: false 
          }
        });
        
        this.recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        this.recorder.ondataavailable = onDataAvailable;
        this.recorder.start(100);
        this.isRecording = true;
        return true;
      } catch (error) {
        console.error('Error starting recording:', error);
        return false;
      }
    }
  
    stop(onStopCallback) {
      if (!this.isRecording) return;
      
      if (this.recorder) {
        this.recorder.onstop = onStopCallback;
        this.recorder.stop();
        this.recorder.stream.getTracks().forEach(track => track.stop());
        this.isRecording = false;
      }
    }
  }
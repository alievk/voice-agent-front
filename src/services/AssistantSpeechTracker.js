export class AssistantSpeechTracker {
  constructor() {
    this.audioStartTime = null;
    this.interruptId = null;
    this.lastSpeechId = null;
  }

  reset() {
    this.audioStartTime = null;
    this.interruptId = null;
    this.lastSpeechId = null;
  }

  startNewSpeech(speechId) {
    this.audioStartTime = Date.now();
    this.interruptId = null;
    this.lastSpeechId = speechId;
    return this.audioStartTime;
  }

  interrupt() {
    if (!this.audioStartTime) return null;
    const audioDuration = Date.now() - this.audioStartTime;
    this.interruptId = this.lastSpeechId;
    return {
      speechId: this.lastSpeechId,
      interruptedAtMs: audioDuration
    };
  }

  shouldPlayAudio(speechId) {
    return this.interruptId !== speechId;
  }
} 
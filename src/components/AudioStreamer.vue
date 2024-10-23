<template>
  <div class="audio-streamer">
    <div class="button-grid">
      <button 
        @click="toggleRecording" 
        :class="['button', 'record-button', { 'active': isRecording }]"
      >
        {{ isRecording ? 'Stop Recording' : 'Start Recording' }}
      </button>
      <button 
        v-for="(audio, index) in audioFiles" 
        :key="index" 
        @click="() => toggleAudio(index)" 
        :class="['button', 'play-button', { 'active': isPlaying[index] }]"
      >
        {{ isPlaying[index] ? `Stop Audio ${index + 1}` : `Play Audio ${index + 1}` }}
      </button>
    </div>
    <p class="status">{{ status }}</p>
  </div>
</template>

<script>
export default {
  data() {
    return {
      isRecording: false,
      isPlaying: [false, false, false],
      socket: null,
      mediaRecorder: null,
      audioContext: null,
      audioSource: null,
      status: 'Ready',
      audioFiles: [
        'data/jfk_full.mp4',
        'data/officer_en.mp4',
        'data/virus_en.m4a'
      ],
      currentAudioIndex: null,
      mediaSource: null,
      sourceBuffer: null,
      audioElement: null,
      chunks: [],
      isPlayingAudio: false,
    };
  },

  methods: {
    async toggleRecording() {
      if (this.isRecording) {
        this.stopRecording();
      } else {
        await this.startRecording();
      }
    },

    async startRecording() {
      try {
        if (!this.isWebSocketConnected()) {
          await this.connectWebSocket();
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { sampleRate: 16000, channelCount: 1, echoCancellation: false, noiseSuppression: false }
        });
        this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && this.isWebSocketConnected()) {
            this.socket.send(event.data);
          }
        };
        this.mediaRecorder.start(100);
        this.isRecording = true;
        this.$emit('recording-started');
        this.socket.send('START_RECORDING');
      } catch (error) {
        console.error('Error starting recording:', error);
        this.status = `Error: ${error.message}`;
      }
    },

    stopRecording() {
      if (this.mediaRecorder) {
        this.mediaRecorder.stop();
        this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        this.isRecording = false;
        this.mediaRecorder.onstop = () => {
          if (this.isWebSocketConnected()) {
            this.socket.send('STOP_RECORDING');
          }
        };
      }
    },

    async connectWebSocket() {
      if (this.isWebSocketConnected()) return;
      
      return new Promise((resolve, reject) => {
        const wsUrl = `wss://${window.location.hostname}:8765`;
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = () => {
          console.log('WebSocket connected successfully');
          resolve();
        };
        
        this.socket.onerror = (error) => {
          console.error('WebSocket connection error:', error);
          this.status = 'Connection error';
          reject(error);
        };
        
        this.socket.onclose = (event) => {
          console.log('WebSocket connection closed:', event.code, event.reason);
        };

        setTimeout(() => {
          if (!this.isWebSocketConnected()) {
            reject(new Error('WebSocket connection timed out'));
          }
        }, 5000);
        
        this.socket.onmessage = this.handleWebSocketMessage;
      });
    },

    async handleWebSocketMessage(event) {
      if (event.data instanceof Blob) {
        console.log('Received audio chunk:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          const arrayBuffer = await event.data.arrayBuffer();
          this.handleAudioData(arrayBuffer);
        } else {
          console.warn('Received empty chunk');
        }
      } else {
        const data = JSON.parse(event.data);
        console.log('Received JSON data:', data);
        this.$emit('transcription-received', {
          role: data.role,
          confirmedText: data.content,
          unconfirmedText: '',
          timestamp: data.time,
          messageId: data.id
        });
      }
    },

    disconnectWebSocket() {
      if (this.socket) {
        this.socket.close(1000, "Normal closure");
        this.socket = null;
        console.log('WebSocket disconnected');
      }
    },

    async toggleAudio(index) {
      if (this.isPlaying[index]) {
        this.stopPlayback();
      } else {
        await this.playAudio(index);
      }
    },

    async playAudio(index) {
      if (this.isPlaying.some(playing => playing)) return;

      try {
        if (!this.isWebSocketConnected()) {
          await this.connectWebSocket();
        }
        
        const response = await fetch(process.env.BASE_URL + this.audioFiles[index]);
        const arrayBuffer = await response.arrayBuffer();

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

        this.audioSource = this.audioContext.createBufferSource();
        this.audioSource.buffer = audioBuffer;
        this.audioSource.connect(this.audioContext.destination);

        const streamDestination = this.audioContext.createMediaStreamDestination();
        this.audioSource.connect(streamDestination);

        this.mediaRecorder = new MediaRecorder(streamDestination.stream, { mimeType: 'audio/webm' });
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && this.isWebSocketConnected()) {
            this.socket.send(event.data);
          }
        };

        this.mediaRecorder.start(100);
        this.audioSource.start(0);

        this.audioSource.onended = this.stopPlayback;

        this.isPlaying[index] = true;
        this.currentAudioIndex = index;
        this.status = `Playing audio ${index + 1}`;
        this.$emit('audio-playback-started', index);
      } catch (error) {
        console.error('Error playing audio:', error);
        this.status = 'Error playing audio';
      }
    },

    stopPlayback() {
      if (this.audioSource) {
        this.audioSource.stop();
        this.audioSource.disconnect();
        this.audioSource = null;
      }
      if (this.mediaRecorder) {
        this.mediaRecorder.stop();
        this.mediaRecorder = null;
      }
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close().catch(console.error);
      }
      if (this.currentAudioIndex !== null) {
        this.isPlaying[this.currentAudioIndex] = false;
        this.currentAudioIndex = null;
      }
      this.status = 'Ready';
    },

    isWebSocketConnected() {
      return this.socket && this.socket.readyState === WebSocket.OPEN;
    },

    initializeMediaSource() {
      this.mediaSource = new MediaSource();
      this.audioElement = new Audio();
      this.audioElement.src = URL.createObjectURL(this.mediaSource);

      this.mediaSource.addEventListener('sourceopen', () => {
        this.sourceBuffer = this.mediaSource.addSourceBuffer('audio/webm; codecs="opus"');
        this.sourceBuffer.mode = 'sequence';
        this.sourceBuffer.addEventListener('updateend', this.appendNextChunk);
      });
    },

    handleAudioData(chunk) {
      if (!this.mediaSource) this.initializeMediaSource();
      this.chunks.push(chunk);
      if (!this.sourceBuffer || this.sourceBuffer.updating) return;
      this.appendNextChunk();
    },

    appendNextChunk() {
      if (this.chunks.length === 0 || this.sourceBuffer.updating) return;
      const chunk = this.chunks.shift();
      this.sourceBuffer.appendBuffer(chunk);
      if (!this.isPlayingAudio) this.playReceivedAudio();
    },

    async playReceivedAudio() {
      if (this.isPlayingAudio) return;
      try {
        await this.audioElement.play();
        this.isPlayingAudio = true;
        console.log('Audio playback started');
      } catch (error) {
        console.error('Error playing audio:', error);
        this.isPlayingAudio = false;
      }
    },

    async initializeConnection() {
      try {
        await this.connectWebSocket();
        this.status = 'Connected to server';
      } catch (error) {
        console.error('Failed to connect to server:', error);
        this.status = 'Failed to connect to server';
      }
    },
  },

  mounted() {
    this.initializeMediaSource();
    this.initializeConnection();
  },

  beforeUnmount() {
    if (this.mediaSource && this.mediaSource.readyState === 'open') {
      this.mediaSource.endOfStream();
    }
    if (this.audioElement) {
      URL.revokeObjectURL(this.audioElement.src);
      this.audioElement.pause();
      this.audioElement.src = '';
    }
    this.stopRecording();
    this.stopPlayback();
    this.disconnectWebSocket();
  },
};
</script>

<style scoped>
.audio-streamer {
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.button-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.button {
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  border-radius: 6px;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.record-button {
  background-color: #ff4136;
  color: white;
}

.record-button:hover, .record-button.active {
  background-color: #e60000;
}

.play-button {
  background-color: #4CAF50;
  color: white;
}

.play-button:hover, .play-button.active {
  background-color: #45a049;
}

.status {
  font-size: 16px;
  text-align: center;
  color: #333;
  margin-top: 12px;
}
</style>

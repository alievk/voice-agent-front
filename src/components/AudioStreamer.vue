<template>
  <div>
    <div class="button-row">
      <button @click="newConversation" class="button">New Conversation</button>
    </div>
    <div class="button-row">
      <button @click="toggleRecording" class="button">
        {{ isRecording ? 'Stop Recording' : 'Start Recording' }}
      </button>
      <button v-for="(audio, index) in audioFiles" :key="index" @click="() => toggleAudio(index)" class="button">
        {{ isPlaying[index] ? `Stop Audio ${index + 1}` : `Play Audio ${index + 1}` }}
      </button>
    </div>
    <p>{{ status }}</p>
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
      currentAudioIndex: null
    };
  },

  methods: {
    async newConversation() {
      this.stopRecording();
      this.stopPlayback();
      
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send('END_CONVERSATION');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second
      }
      
      this.disconnectWebSocket();
      await this.connectWebSocket();
      this.$emit('new-conversation');
    },

    async toggleRecording() {
      if (this.isRecording) {
        this.stopRecording();
      } else {
        if (!this.isWebSocketConnected()) {
          this.status = 'Error: WebSocket not connected';
          return;
        }
        await this.startRecording();
      }
    },

    async startRecording() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: false,
            noiseSuppression: false,
          }
        });
        const options = { mimeType: 'audio/webm' };
        this.mediaRecorder = new MediaRecorder(stream, options);
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(event.data);
          }
        };
        this.mediaRecorder.start(100); // Send audio data every 100ms
        this.isRecording = true;
        this.$emit('recording-started');

        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send('START_RECORDING');
        }
      } catch (error) {
        console.error('Error starting recording:', error);
        this.status = 'Error starting recording';
      }
    },

    stopRecording() {
      if (this.mediaRecorder) {
        this.mediaRecorder.stop();
        this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        this.isRecording = false;
        
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send('STOP_RECORDING');
        }
      }
    },

    async connectWebSocket() {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        console.log('WebSocket already connected');
        return;
      }
      
      return new Promise((resolve, reject) => {
        const wsUrl = `wss://${window.location.hostname}:8765`;
        
        console.log(`Attempting to connect to WebSocket at ${wsUrl}`);
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

        // Add a timeout to reject the promise if the connection takes too long
        setTimeout(() => {
          if (this.socket.readyState !== WebSocket.OPEN) {
            reject(new Error('WebSocket connection timed out'));
          }
        }, 5000);
        
        this.socket.onmessage = (event) => {
          console.log('Received data:', event.data);
          const data = JSON.parse(event.data);
          const formattedData = {
            role: data.role,
            confirmedText: data.content,
            unconfirmedText: '',
            timestamp: data.time,
            messageId: data.message_id
          };
          this.$emit('transcription-received', formattedData);
        };
      });
    },

    disconnectWebSocket() {
      if (this.socket) {
        this.socket.close(1000, "Normal closure");
        this.socket = null;
        this.isInitialized = false;
        console.log('WebSocket disconnected');
      }
    },

    async toggleAudio(index) {
      if (this.isPlaying[index]) {
        this.stopPlayback();
      } else {
        if (!this.isWebSocketConnected()) {
          this.status = 'Error: WebSocket not connected';
          return;
        }
        await this.playAudio(index);
      }
    },

    async playAudio(index) {
      if (this.isPlaying.some(playing => playing)) return;

      try {
        const response = await fetch(process.env.BASE_URL + this.audioFiles[index]);
        const arrayBuffer = await response.arrayBuffer();

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

        this.audioSource = this.audioContext.createBufferSource();
        this.audioSource.buffer = audioBuffer;

        // Connect to speakers
        this.audioSource.connect(this.audioContext.destination);

        // Connect to MediaStreamDestination for WebSocket streaming
        const streamDestination = this.audioContext.createMediaStreamDestination();
        this.audioSource.connect(streamDestination);

        const options = { mimeType: 'audio/webm' };
        this.mediaRecorder = new MediaRecorder(streamDestination.stream, options);

        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(event.data);
          }
        };

        this.mediaRecorder.start(100);
        this.audioSource.start(0);

        this.audioSource.onended = () => {
          this.stopPlayback();
        };

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
        this.audioContext.close().then(() => {
          this.audioContext = null;
        }).catch(error => {
          console.error('Error closing AudioContext:', error);
        });
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
  },
  beforeUnmount() {
    this.stopRecording();
    this.stopPlayback();
    this.disconnectWebSocket();
  },
};
</script>

<style scoped>
.button-row {
  display: flex;
  margin-bottom: 10px;
}

.button {
  margin-right: 10px;
  padding: 10px;
  font-size: 16px;
  cursor: pointer;
}
</style>

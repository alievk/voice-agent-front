<template>
  <div>
    <button @click="toggleRecording">
      {{ isRecording ? 'Stop Recording' : 'Start Recording' }}
    </button>
    <p>{{ status }}</p>
  </div>
</template>

<script>
export default {
  data() {
    return {
      isRecording: false,
      socket: null,
      mediaRecorder: null,
      status: 'Ready'
    };
  },
  methods: {
    async testWebSocket() {
      try {
        await this.connectWebSocket();
        this.socket.send('Hello, WebSocket!');
        this.socket.onmessage = (event) => {
          this.message = event.data;
        };
      } catch (error) {
        console.error('WebSocket test failed:', error);
        this.message = 'WebSocket test failed';
      }
    },
    async toggleRecording() {
      if (this.isRecording) {
        this.stopRecording();
      } else {
        await this.connectWebSocket();
        this.startRecording();
      }
    },
    async startRecording() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.mediaRecorder = new MediaRecorder(stream);
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.socket.send(event.data);
          }
        };
        this.mediaRecorder.start(100); // Send audio data every 100ms
        this.isRecording = true;
      } catch (error) {
        console.error('Error starting recording:', error);
      }
    },
    stopRecording() {
      if (this.mediaRecorder) {
        this.mediaRecorder.stop();
        this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        this.isRecording = false;
        this.socket.send('STOP_RECORDING');  // Send stop signal to server
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
    sendAudioChunk(chunk) {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        if (chunk instanceof Float32Array) {
          this.socket.send(chunk.buffer);
          console.log(`Sent audio chunk: ${chunk.length} samples`);
        } else {
          console.warn('Invalid chunk type. Expected Float32Array.');
        }
      } else {
        console.warn('WebSocket is not open. Cannot send audio chunk.');
        this.stopRecording();
      }
    },
  },
  beforeUnmount() {
    this.stopRecording();
    this.disconnectWebSocket();
  },
};
</script>

<style scoped>
.mic-button {
  font-size: 24px;
  padding: 10px;
  border: none;
  background-color: #f0f0f0;
  border-radius: 50%;
  cursor: pointer;
}

.mic-button.recording {
  background-color: #ff4444;
}
</style>
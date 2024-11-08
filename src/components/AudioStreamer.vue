<template>
  <div class="audio-streamer">
    <div class="button-container">
      <!-- iOS style switch -->
      <div class="switch-wrapper">
        <span class="switch-label">Audio</span>
        <label class="ios-switch">
          <input 
            type="checkbox"
            :checked="inputMode === 'text'"
            @change="inputMode = $event.target.checked ? 'text' : 'audio'"
          >
          <span class="slider"></span>
        </label>
        <span class="switch-label">Text</span>
      </div>

      <div v-show="inputMode === 'audio'">
        <button 
          @mousedown="handleMouseDown"
          @mouseup="handleMouseUp"
          :class="['button', 'record-button', { 'active': isRecordingUserAudio }]"
          :disabled="buttonsDisabled"
        >
          {{ isRecordingUserAudio ? 'Release to Send' : 'Hold to Talk' }}
        </button>
        <div class="play-buttons">
          <button 
            v-for="(audio, index) in userAudioFiles" 
            :key="index" 
            @click="() => toggleUserAudio(index)" 
            :class="['button', 'play-button', { 'active': isPlayingUserAudio[index] }]"
            :disabled="buttonsDisabled"
          >
            {{ isPlayingUserAudio[index] ? `Stop ${index + 1}` : `Play ${index + 1}` }}
          </button>
        </div>
      </div>

      <div 
        class="text-input-container"
        v-show="inputMode === 'text'"
      >
        <input 
          type="text" 
          v-model="textMessage" 
          placeholder="Type a message..."
          @keyup.enter="sendTextMessage"
        >
        <button 
          @click="sendTextMessage" 
          :class="['button', 'send-button']"
          :disabled="buttonsDisabled"
        >
          Send
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    agentName: {
      type: String,
      default: ''
    }
  },
  watch: {
    agentName(newAgentName) {
      this.reload(newAgentName);
    }
  },
  data() {
    return {
      isRecordingUserAudio: false,
      isPlayingUserAudio: [false, false, false],
      socket: null,
      userAudioRecorder: null,
      userAudioContext: null,
      userAudioSource: null,
      userAudioFiles: [
        'data/jfk_full.mp4',
        'data/what_is_strength.mp4',
        'data/virus_en.m4a'
      ],
      currentUserAudioIndex: null,
      assistantAudioMediaSource: null,
      assistantAudioSourceBuffer: null,
      assistantAudioElement: null,
      assistantAudioChunks: [],
      isPlayingAssistantAudio: false,
      buttonsDisabled: true,
      mouseDownTime: 0,
      lastAssistantSpeechId: null,
      interruptSpeechId: null,
      assistantAudioStartTime: null,
      textMessage: '',
      inputMode: 'audio',
    };
  },

  methods: {
    async startRecordingUserAudio() {
      if (this.isRecordingUserAudio) return;
      try {
        this.sendUserInterrupt();
        this.stopAssistantAudioPlayback();
        this.sendStartRecordingMessage();

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { sampleRate: 16000, channelCount: 1, echoCancellation: false, noiseSuppression: false }
        });
        this.userAudioRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        this.userAudioRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && this.isWebSocketConnected()) {
            this.socket.send(event.data);
          }
        };
        this.userAudioRecorder.start(100);
        this.isRecordingUserAudio = true;
        this.$emit('system-message', 'Started recording user audio');
      } catch (error) {
        console.error('Error starting recording:', error);
      }
    },

    stopRecordingUserAudio() {
      if (!this.isRecordingUserAudio) return;
      this.sendStopRecordingMessage();
      if (this.userAudioRecorder) {
        this.userAudioRecorder.stop();
        this.userAudioRecorder.stream.getTracks().forEach(track => track.stop());
        this.isRecordingUserAudio = false;
      }
      this.$emit('system-message', 'Stopped recording user audio');
    },

    async connectWebSocket() {
      if (this.isWebSocketConnected()) return;
      
      return new Promise((resolve, reject) => {
        const wsUrl = `wss://${window.location.hostname}:8765`;
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = () => {
          this.sendInitMessage();
          resolve();
        };
        
        this.socket.onerror = (error) => {
          console.error('WebSocket connection error:', error);
          this.$emit('system-message', 'Connection error');
          reject(error);
        };
        
        this.socket.onclose = (event) => {
          const reason = this.getWebSocketCloseReason(event.code);
          console.log(`WebSocket closed: ${reason}`);
          this.$emit('system-message', `Connection closed: ${reason}`);
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
      this.buttonsDisabled = false;
      const arrayBuffer = await event.data.arrayBuffer();
      const dataView = new DataView(arrayBuffer);
      const metadataLength = dataView.getUint32(0);
      const metadata = JSON.parse(new TextDecoder().decode(arrayBuffer.slice(4, 4 + metadataLength)));

      if (metadata.type === 'audio') {
        const audioData = arrayBuffer.slice(4 + metadataLength);
        if (this.interruptSpeechId !== metadata.speech_id) {
          this.handleAssistantAudioData(audioData);
        }
        if (this.lastAssistantSpeechId !== metadata.speech_id) {
          this.$emit('system-message', 'New assistant speech started');
          this.assistantAudioStartTime = Date.now();
          this.interruptSpeechId = null;
        }
        this.lastAssistantSpeechId = metadata.speech_id;
      }
      else if (metadata.type === 'message') {
        this.$emit('system-message', `Received message from ${metadata.role}: ${metadata.content}`);
        this.$emit('message-received', {
          role: metadata.role,
          content: metadata.content,
          timestamp: metadata.time,
          messageId: metadata.id
        });
      }
      else {
        console.error('Unknown message type:', metadata.type);
      }
    },

    sendUserInterrupt() {
      if (!this.assistantAudioStartTime) return;
      const audioDuration = Date.now() - this.assistantAudioStartTime;
      if (this.isWebSocketConnected()) {
        const message = JSON.stringify({ 
          type: 'interrupt',
          speech_id: this.lastAssistantSpeechId,
          interrupted_at_ms: audioDuration
        });
        this.socket.send(message);
      }
      this.interruptSpeechId = this.lastAssistantSpeechId;
    },

    disconnectWebSocket() {
      if (this.socket) {
        this.socket.close(1000, "Normal closure");
        this.socket = null;
        console.log('WebSocket disconnected');
      }
    },

    async toggleUserAudio(index) {
      if (this.isPlayingUserAudio[index]) {
        this.stopUserAudioPlayback();
      } else {
        await this.playUserAudio(index);
      }
    },

    async playUserAudio(index) {
      if (this.isPlayingUserAudio.some(playing => playing)) return;
      this.sendStartRecordingMessage();
      try {
        const response = await fetch(process.env.BASE_URL + this.userAudioFiles[index]);
        const arrayBuffer = await response.arrayBuffer();

        this.userAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await this.userAudioContext.decodeAudioData(arrayBuffer);

        this.userAudioSource = this.userAudioContext.createBufferSource();
        this.userAudioSource.buffer = audioBuffer;
        this.userAudioSource.connect(this.userAudioContext.destination);

        const streamDestination = this.userAudioContext.createMediaStreamDestination();
        this.userAudioSource.connect(streamDestination);

        this.userAudioRecorder = new MediaRecorder(streamDestination.stream, { mimeType: 'audio/webm' });
        this.userAudioRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && this.isWebSocketConnected()) {
            this.socket.send(event.data);
          }
        };

        this.userAudioRecorder.start(100);
        this.userAudioSource.start(0);

        this.userAudioSource.onended = () => {
          this.sendStopRecordingMessage();
        };

        this.isPlayingUserAudio[index] = true;
        this.currentUserAudioIndex = index;
        this.$emit('system-message', `Playing user audio ${index + 1}`);
      } catch (error) {
        console.error('Error playing user audio:', error);
        this.$emit('system-message', 'Error playing user audio');
      }
    },

    stopUserAudioPlayback() {
      this.sendStopRecordingMessage()
      if (this.userAudioSource) {
        this.userAudioSource.stop();
        this.userAudioSource.disconnect();
        this.userAudioSource = null;
      }
      if (this.userAudioRecorder) {
        this.userAudioRecorder.stop();
        this.userAudioRecorder = null;
      }
      if (this.userAudioContext && this.userAudioContext.state !== 'closed') {
        this.userAudioContext.close().catch(console.error);
      }
      if (this.currentUserAudioIndex !== null) {
        this.isPlayingUserAudio[this.currentUserAudioIndex] = false;
        this.currentUserAudioIndex = null;
      }
      this.$emit('system-message', 'Stopped playing user audio');
    },

    isWebSocketConnected() {
      return this.socket && this.socket.readyState === WebSocket.OPEN;
    },

    initializeAssistantAudioMediaSource() {
      this.assistantAudioMediaSource = new MediaSource();
      this.assistantAudioElement = new Audio();
      this.assistantAudioElement.src = URL.createObjectURL(this.assistantAudioMediaSource);

      this.assistantAudioMediaSource.addEventListener('sourceopen', () => {
        this.assistantAudioSourceBuffer = this.assistantAudioMediaSource.addSourceBuffer('audio/webm; codecs="opus"');
        this.assistantAudioSourceBuffer.mode = 'sequence';
        this.assistantAudioSourceBuffer.addEventListener('updateend', this.appendNextAssistantAudioChunk);
      });
    },

    handleAssistantAudioData(chunk) {
      if (!this.assistantAudioMediaSource) this.initializeAssistantAudioMediaSource();
      this.assistantAudioChunks.push(chunk);
      if (!this.assistantAudioSourceBuffer || this.assistantAudioSourceBuffer.updating) return;
      this.appendNextAssistantAudioChunk();
    },

    appendNextAssistantAudioChunk() {
      if (this.assistantAudioChunks.length === 0 || this.assistantAudioSourceBuffer.updating) return;
      const chunk = this.assistantAudioChunks.shift();
      this.assistantAudioSourceBuffer.appendBuffer(chunk);
      if (!this.isPlayingAssistantAudio) this.playAssistantAudio();
    },

    async playAssistantAudio() {
      if (this.isPlayingAssistantAudio) return;
      try {
        await this.assistantAudioElement.play();
        this.isPlayingAssistantAudio = true;
      } catch (error) {
        console.error('Error playing assistant audio:', error);
        this.isPlayingAssistantAudio = false;
      }
    },

    stopAssistantAudioPlayback() {
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
      this.assistantAudioStartTime = null;
      
      this.initializeAssistantAudioMediaSource();
    },

    async initializeConnection() {
      try {
        await this.connectWebSocket();
        this.$emit('system-message', 'Connected to server');
        this.$emit('connection-established');
      } catch (error) {
        console.error('Failed to connect to server:', error);
        this.$emit('system-message', 'Failed to connect to server');
      }
    },

    handleMouseDown() {
      this.mouseDownTime = Date.now();
      this.startRecordingUserAudio();
    },

    handleMouseUp() {
      const timeDiff = Date.now() - this.mouseDownTime;

      if (timeDiff < 200) { // Quick click
        setTimeout(() => this.stopRecordingUserAudio(), 1000);
      } else {
        this.stopRecordingUserAudio();
      }
    },

    sendStartRecordingMessage() {
      if (this.isWebSocketConnected()) {
        const message = JSON.stringify({ type: 'start_recording' });
        this.socket.send(message);
      }
    },

    sendStopRecordingMessage() {
      if (this.isWebSocketConnected()) {
        const message = JSON.stringify({ type: 'stop_recording' });
        this.socket.send(message);
      }
    },

    sendTextMessage() {
      if (!this.textMessage.trim() || !this.isWebSocketConnected()) return;
      
      const message = JSON.stringify({
        type: 'manual_text',
        content: this.textMessage.trim()
      });
      this.socket.send(message);
      this.$emit('system-message', `Sent text message: ${this.textMessage.trim()}`);
      this.textMessage = '';
    },

    sendInitMessage() {
      if (!this.isWebSocketConnected()) return;
      const message = JSON.stringify({
        type: 'init',
        agent_name: this.agentName
      });
      console.log('sendInitMessage', message);
      this.socket.send(message);
    },

    reload(agentName) {
      console.log('Reload with agent', agentName);

      this.shutdown();
      this.$emit('clean-messages');

      this.initializeAssistantAudioMediaSource();
      this.initializeConnection();
    },

    shutdown() {
      // Clean up audio elements
      if (this.assistantAudioMediaSource && this.assistantAudioMediaSource.readyState === 'open') {
        this.assistantAudioMediaSource.endOfStream();
      }
      if (this.assistantAudioElement) {
        URL.revokeObjectURL(this.assistantAudioElement.src);
        this.assistantAudioElement.pause();
        this.assistantAudioElement.src = '';
      }
      
      // Stop all audio processes
      this.stopRecordingUserAudio();
      this.stopUserAudioPlayback();
      this.disconnectWebSocket();

      // Reset all state variables
      this.isRecordingUserAudio = false;
      this.isPlayingUserAudio = [false, false, false];
      this.userAudioRecorder = null;
      this.userAudioContext = null;
      this.userAudioSource = null;
      this.currentUserAudioIndex = null;
      this.assistantAudioMediaSource = null;
      this.assistantAudioSourceBuffer = null;
      this.assistantAudioElement = null;
      this.assistantAudioChunks = [];
      this.isPlayingAssistantAudio = false;
      this.buttonsDisabled = true;
      this.mouseDownTime = 0;
      this.lastAssistantSpeechId = null;
      this.interruptSpeechId = null;
      this.assistantAudioStartTime = null;
      this.textMessage = '';
    },

    getWebSocketCloseReason(code) {
      const codes = {
        1000: 'Normal closure',
        1001: 'Going away - client/server is disconnecting',
        1002: 'Protocol error',
        1003: 'Unsupported data',
        1004: 'Reserved',
        1005: 'No status received',
        1006: 'Abnormal closure - connection dropped',
        1007: 'Invalid frame payload data',
        1008: 'Policy violation',
        1009: 'Message too big',
        1010: 'Mandatory extension missing',
        1011: 'Internal server error',
        1012: 'Service restart',
        1013: 'Try again later',
        1014: 'Bad gateway',
        1015: 'TLS handshake failure'
      };
      return codes[code] || `Unknown code: ${code}`;
    },
  },

  mounted() {
  },

  beforeUnmount() {
  },
};
</script>

<style scoped>
.audio-streamer {
  background-color: #ffffff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-top: 20px;
}

.button-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.button {
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid #d1d5db;
  border-radius: 20px; /* Increased border-radius for more rounded corners */
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin: 5px;
  background-color: #ffffff;
  color: #333333;
}

.button:hover {
  background-color: #f3f4f6;
}

.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.record-button {
  background-color: #ffffff;
  color: #333333;
  border-color: #e74c3c;
}

.record-button:hover {
  background-color: #fff5f5;
}

.record-button.active {
  background-color: #e74c3c;
  color: white;
}

.play-buttons {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 10px;
}

.play-button {
  background-color: #ffffff;
  color: #333333;
  border-color: #3498db;
}

.play-button:hover {
  background-color: #f0f7ff;
}

.play-button.active {
  background-color: #3498db;
  color: white;
}

.text-input-container {
  display: flex;
  gap: 8px;
  width: 100%;
  max-width: 500px;
  margin-top: 16px;
}

input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 20px;
  font-size: 14px;
}

.send-button {
  background-color: #ffffff;
  color: #333333;
  border-color: #2ecc71;
}

.send-button:hover {
  background-color: #f0fff4;
}

.send-button:active {
  background-color: #2ecc71;
  color: white;
}

.switch-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.switch-label {
  font-size: 13px;
  color: #666;
}

.ios-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 24px;
}

.ios-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #e9e9ea;
  border-radius: 24px;
  transition: .3s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  border-radius: 50%;
  transition: .3s;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

input:checked + .slider {
  background-color: #34c759;
}

input:checked + .slider:before {
  transform: translateX(16px);
}

/* Optional: hover effect */
.slider:hover:before {
  box-shadow: 0 0 1px #34c759;
}
</style>

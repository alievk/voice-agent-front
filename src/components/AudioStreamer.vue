<template>
  <div class="audio-streamer">
    <div class="button-container fixed-height">
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

      <!-- Content area with fixed position -->
      <div class="input-modes-container">
        <!-- Audio mode -->
        <div v-show="inputMode === 'audio'" class="mode-content">
          <div class="audio-buttons">
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
        </div>

        <!-- Text mode -->
        <div v-show="inputMode === 'text'" class="mode-content">
          <div class="text-input-container">
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
    </div>
  </div>
</template>

<script>
import { AudioFilePlayer } from '../services/AudioFilePlayer.js';
import { AudioStreamPlayer } from '../services/AudioStreamPlayer.js';
import { AudioRecorder } from '../services/AudioRecorder.js';
import { WebSocketManager } from '../services/WebSocketManager.js';

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
      userAudioFiles: [
        'data/jfk_full.mp4',
        'data/what_is_strength.mp4',
        'data/virus_en.m4a'
      ],
      currentUserAudioIndex: null,
      assistantAudioStartTime: null,
      textMessage: '',
      inputMode: 'audio',
      audioFilePlayer: new AudioFilePlayer(),
      audioStreamPlayer: new AudioStreamPlayer(),
      audioRecorder: new AudioRecorder(),
      webSocketManager: new WebSocketManager(),
      buttonsDisabled: true
    };
  },

  methods: {
    async startRecordingUserAudio() {
      if (this.isRecordingUserAudio) return;
      try {
        this.sendUserInterrupt();
        this.audioStreamPlayer.stop();
        this.webSocketManager.sendJson({ type: 'start_recording' });
        const success = await this.audioRecorder.start((event) => {
          if (event.data.size > 0) {
            this.webSocketManager.send(event.data);
          }
        });

        if (success) {
          this.isRecordingUserAudio = true;
          this.$emit('system-message', 'Started recording user audio');
        }
      } catch (error) {
        console.error('Error starting recording:', error);
      }
    },

    stopRecordingUserAudio() {
      if (!this.isRecordingUserAudio) return;
      this.webSocketManager.sendJson({ type: 'stop_recording' });
      this.audioRecorder.stop();
      this.isRecordingUserAudio = false;
      this.$emit('system-message', 'Stopped recording user audio');
    },

    async initializeConnection() {
      try {
        this.webSocketManager.onAudioMessage = this.handleAudioMessage;
        this.webSocketManager.onJsonMessage = this.handleJsonMessage;
        this.webSocketManager.onSystemMessage = (msg) => this.$emit('system-message', msg);
        await this.webSocketManager.connect(window.location.hostname);
        this.sendInitMessage();
        this.$emit('system-message', 'Connected to server');
        this.$emit('connection-established');
      } catch (error) {
        console.error('Failed to connect to server:', error);
        this.$emit('system-message', 'Failed to connect to server');
      }
    },

    handleAudioMessage(audioData, metadata) {
      if (this.interruptSpeechId !== metadata.speech_id) {
        this.audioStreamPlayer.handleAudioData(audioData);
      }
      if (this.lastAssistantSpeechId !== metadata.speech_id) {
        this.$emit('system-message', 'New assistant speech started');
        this.assistantAudioStartTime = Date.now();
        this.interruptSpeechId = null;
      }
      this.lastAssistantSpeechId = metadata.speech_id;
    },

    handleJsonMessage(metadata) {
      this.$emit('system-message', `Received message from ${metadata.role}: ${metadata.content}`);
      this.$emit('message-received', {
        role: metadata.role,
        content: metadata.content,
        timestamp: metadata.time,
        messageId: metadata.id
      });
      this.buttonsDisabled = false;
    },

    sendUserInterrupt() {
      if (!this.assistantAudioStartTime) return;
      const audioDuration = Date.now() - this.assistantAudioStartTime;
      const message = JSON.stringify({ 
        type: 'interrupt',
        speech_id: this.lastAssistantSpeechId,
        interrupted_at_ms: audioDuration
      });
      this.webSocketManager.send(message);
      this.interruptSpeechId = this.lastAssistantSpeechId;
    },

    disconnectWebSocket() {
      this.webSocketManager.disconnect();
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
      this.webSocketManager.sendJson({ type: 'start_recording' });
      try {
        const audioUrl = process.env.BASE_URL + this.userAudioFiles[index];
        await this.audioFilePlayer.play(audioUrl, (event) => {
          if (event.data.size > 0) {
            this.webSocketManager.send(event.data);
          }
        }, () => {
          this.webSocketManager.sendJson({ type: 'stop_recording' });
          this.isPlayingUserAudio[index] = false;
          this.currentUserAudioIndex = null;
          this.$emit('system-message', `Stopped playing user audio ${index + 1}`);
        });

        this.isPlayingUserAudio[index] = true;
        this.currentUserAudioIndex = index;
        this.$emit('system-message', `Playing user audio ${index + 1}`);
      } catch (error) {
        console.error('Error playing user audio:', error);
        this.$emit('system-message', 'Error playing user audio');
      }
    },

    stopUserAudioPlayback() {
      this.webSocketManager.sendJson({ type: 'stop_recording' });
      this.audioFilePlayer.stop();
      if (this.currentUserAudioIndex !== null) {
        this.isPlayingUserAudio[this.currentUserAudioIndex] = false;
        this.currentUserAudioIndex = null;
      }
      this.$emit('system-message', 'Stopped playing user audio');
    },

    stopAssistantAudioPlayback() {
      this.audioStreamPlayer.stop();
      this.audioStreamPlayer.initialize();
      this.assistantAudioStartTime = null;
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

    sendTextMessage() {
      if (!this.textMessage.trim()) return;
      this.webSocketManager.sendJson({
        type: 'manual_text',
        content: this.textMessage.trim()
      });
      this.$emit('system-message', `Sent text message: ${this.textMessage.trim()}`);
      this.textMessage = '';
    },

    sendInitMessage() {
      this.webSocketManager.sendJson({
        type: 'init',
        agent_name: this.agentName
      });
    },

    reload(agentName) {
      console.log('Reload with agent', agentName);

      this.shutdown();
      this.$emit('clean-messages');

      this.audioStreamPlayer.initialize();
      this.initializeConnection();
    },

    shutdown() {
      // Clean up audio elements
      this.audioStreamPlayer.stop();

      // Stop all audio processes
      this.stopRecordingUserAudio();
      this.stopUserAudioPlayback();
      this.disconnectWebSocket();

      // Reset all state variables
      this.isRecordingUserAudio = false;
      this.isPlayingUserAudio = [false, false, false];
      this.currentUserAudioIndex = null;
      this.assistantAudioStartTime = null;
      this.textMessage = '';
      this.buttonsDisabled = true;
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

.fixed-height {
  height: 200px; /* Adjust this value as needed */
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.input-modes-container {
  position: relative;
  height: 120px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mode-content {
  position: absolute;
  width: 100%;
  display: flex;
  justify-content: center;
}

.audio-buttons {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.text-input-container {
  width: 100%;
  display: flex;
  justify-content: center;
}
</style>

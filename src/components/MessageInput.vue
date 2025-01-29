<template>
  <div class="audio-streamer" ref="audioStreamer">
    <div class="button-container fixed-height">
      <!-- iOS style switch -->
      <div class="switch-wrapper">
        <span class="switch-label">Audio</span>
        <label class="ios-switch">
          <input 
            type="checkbox"
            :checked="inputMode === 'text'"
            @change="$emit('input-mode-change', $event.target.checked ? 'text' : 'audio')"
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
            <div class="hint-text"><strong>Hold</strong> the mic to record. <strong>Release</strong> to send.</div>
            <MicButton 
              :is-recording="isRecordingUserAudio"
              :enabled="buttonsEnabled"
              @start-recording="$emit('start-recording')"
              @stop-recording="$emit('stop-recording')"
            />
            <div class="play-buttons">
              <button 
                v-for="(audio, index) in userAudioFiles" 
                :key="index" 
                @click="() => toggleUserAudio(index)" 
                :class="['button', 'play-button', { 'active': isPlayingUserAudio[index] }]"
                :disabled="!buttonsEnabled"
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
              :disabled="!buttonsEnabled"
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
import MicButton from './MicButton.vue'

export default {
  components: {
    MicButton
  },
  props: {
    isRecordingUserAudio: Boolean,
    isPlayingUserAudio: Array,
    inputMode: String,
    buttonsEnabled: Boolean,
    userAudioFiles: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      textMessage: ''
    }
  },
  methods: {
    sendTextMessage() {
      if (!this.textMessage.trim()) return;
      this.$emit('send-text', this.textMessage.trim());
      this.textMessage = '';
    },

    toggleUserAudio(index) {
      this.$emit('toggle-user-audio', index);
    }
  }
}
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
  min-height: 180px;
}

.button {
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid #d1d5db;
  border-radius: 20px;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background-color: #ffffff;
  color: #333333;
  
  &:hover {
    background-color: #f3f4f6;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
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

.slider:hover:before {
  box-shadow: 0 0 1px #34c759;
}

.fixed-height {
  min-height: 180px;
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

.hint-text {
  font-size: 13px;
  color: #666;
  margin-bottom: 12px;
  text-align: center;
}
</style>

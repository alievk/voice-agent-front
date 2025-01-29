<template>
  <div class="record-button-wrapper">
    <button 
      @mousedown="startInteraction"
      @mouseup="endInteraction"
      @mouseleave="endInteraction"
      :class="buttonClasses"
      :aria-label="ariaLabel"
    >
      <img 
        src="/mic.svg" 
        alt=""
        :class="iconClasses"
        class="mic-icon"
      >
    </button>
  </div>
</template>

<script>
const RECORDING_DELAY = 300;
const ANIMATION_DURATION = 200;

export default {
  name: 'MicButton',
  
  props: {
    isRecording: {
      type: Boolean,
      default: false
    },
    enabled: {
      type: Boolean,
      default: false
    }
  },

  data() {
    return {
      isAnimating: false,
      recordingTimeout: null,
      animationTimeout: null
    }
  },

  computed: {
    buttonClasses() {
      return [
        'record-button',
        { 'record-button--disabled': !this.enabled }
      ]
    },

    iconClasses() {
      return {
        'mic-icon--recording': this.isRecording,
        'mic-icon--scaled': this.isAnimating || this.isRecording
      }
    },

    ariaLabel() {
      if (!this.enabled) return 'Recording disabled. Please activate an agent first.'
      return this.isRecording ? 'Stop recording' : 'Start recording'
    }
  },

  methods: {
    startInteraction() {
      if (!this.enabled) {
        this.showDisabledMessage();
        return;
      }

      this.isAnimating = true
      this.recordingTimeout = setTimeout(() => {
        this.$emit('start-recording')
      }, RECORDING_DELAY)
    },

    endInteraction() {
      if (!this.enabled) return

      if (this.recordingTimeout) {
        clearTimeout(this.recordingTimeout)
        this.recordingTimeout = null

        if (this.animationTimeout) clearTimeout(this.animationTimeout)
        this.animationTimeout = setTimeout(() => {
          this.isAnimating = false
        }, ANIMATION_DURATION)
      }

      if (this.isRecording) {
        this.$emit('stop-recording')
      }
    },

    showDisabledMessage() {
      window.alert('Please activate an agent in the sidebar before recording voice.');
    }
  },

  beforeDestroy() {
    // Cleanup timeouts
    if (this.recordingTimeout) clearTimeout(this.recordingTimeout)
    if (this.animationTimeout) clearTimeout(this.animationTimeout)
  }
}
</script>

<style scoped>
.record-button {
  --button-size: 60px;
  --icon-size: 30px;
  --scale-factor: 1.3;
  
  width: var(--button-size);
  height: var(--button-size);
  border-radius: 50%;
  border: 1px solid #d1d5db;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: background-color 0.2s ease;
  user-select: none;
  -webkit-user-drag: none;
}

.record-button:hover {
  background-color: #f9fafb;
}

.record-button--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mic-icon {
  width: var(--icon-size);
  height: var(--icon-size);
  transform: scale(1);
  transition: transform 0.2s ease-out, filter 0.3s ease;
  will-change: transform, filter;
  user-select: none;
  -webkit-user-drag: none;
  pointer-events: none;
}

.mic-icon--scaled {
  transform: scale(var(--scale-factor));
}

.mic-icon--recording {
  filter: invert(27%) sepia(51%) saturate(2878%) hue-rotate(346deg) brightness(104%) contrast(97%);
}

.record-button-wrapper {
  display: inline-block;
}
</style> 
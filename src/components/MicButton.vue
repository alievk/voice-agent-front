<template>
  <div @click="checkDisabled" class="record-button-wrapper">
    <button 
      @mousedown="handleMouseDown"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseLeave"
      :class="['button', 'record-button', { 'active': isRecording }]"
      :style="!enabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}"
    >
      <img 
        src="/mic.svg" 
        alt="Microphone" 
        class="mic-icon"
        :class="{ 'recording': isRecording }"
      >
    </button>
  </div>
</template>

<script>
export default {
  props: {
    isRecording: Boolean,
    enabled: Boolean
  },
  data() {
    return {
      mouseDownTime: null
    }
  },
  methods: {
    checkDisabled() {
      if (!this.enabled) {
        alert('Please activate an agent in the sidebar before recording voice.');
      }
    },
    handleMouseDown() {
      if (!this.enabled) return;
      this.mouseDownTime = Date.now();
      this.$emit('start-recording');
    },
    handleMouseUp() {
      if (!this.enabled) return;
      const timeDiff = Date.now() - this.mouseDownTime;
      if (timeDiff < 200) {
        setTimeout(() => this.$emit('stop-recording'), 1000);
      } else {
        this.$emit('stop-recording');
      }
    },
    handleMouseLeave() {
      if (this.isRecording) {
        this.$emit('stop-recording');
      }
    }
  }
}
</script>

<style scoped>
.record-button {
  background-color: #ffffff;
  color: #333333;
  border-color: #d1d5db;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #d1d5db;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  user-select: none;
  -webkit-user-drag: none;
}

.record-button:hover {
  background-color: #fff5f5;
}

.record-button.active {
  background-color: #ffffff;
  color: #333333;
}

.mic-icon {
  width: 30px;
  height: 30px;
  vertical-align: middle;
  transition: transform 0.3s ease;
  user-select: none;
  -webkit-user-drag: none;
  pointer-events: none;
}

.mic-icon.recording {
  filter: invert(27%) sepia(51%) saturate(2878%) hue-rotate(346deg) brightness(104%) contrast(97%);
  transform: scale(1.2);
}

.record-button-wrapper {
  display: inline-block;
  cursor: pointer;
}
</style> 
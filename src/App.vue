<template>
  <div class="app-container">
    <Sidebar :actions="actions" />
    <div class="main-content">
      <ConversationLog :messages="messages" :isWarmingUp="isWarmingUp" />
      <AudioStreamer 
        @transcription-received="updateTranscription"
        @connection-established="showWarmingUpMessage"
      />
    </div>
  </div>
</template>

<script>
import Sidebar from './components/Sidebar.vue'
import ConversationLog from './components/ConversationLog.vue'
import AudioStreamer from './components/AudioStreamer.vue'

export default {
  components: {
    Sidebar,
    ConversationLog,
    AudioStreamer
  },
  data() {
    return {
      messages: [],
      actions: [],
      isWarmingUp: false,
    }
  },
  methods: {
    updateTranscription(data) {
      const { role, confirmedText, timestamp, messageId } = data;

      if (this.isWarmingUp) {
        this.isWarmingUp = false;
      }

      const existingMessageIndex = this.messages.findIndex(m => m.messageId === messageId);
      if (existingMessageIndex !== -1) {
        this.messages[existingMessageIndex] = { ...this.messages[existingMessageIndex], ...data };
      } else {
        this.messages.push({
          role,
          confirmedText,
          unconfirmedText: '',
          timestamp,
          messageId
        });
      }
    },

    addAction(action) {
      this.actions.push(action);
    },

    showWarmingUpMessage() {
      this.isWarmingUp = true;
    },
  },
}
</script>

<style>
body {
  margin: 0;
  font-family: Arial, sans-serif;
}

.app-container {
  display: flex;
  height: 100vh;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background-color: #ffffff;
}
</style>

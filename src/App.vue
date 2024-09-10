<template>
  <div class="container">
    <Sidebar :actions="actions" />
    <div class="main">
      <ConversationLog :messages="messages" />
      <AudioStreamer @transcription-received="addMessage" />
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
    }
  },
  methods: {
    addMessage(text) {
      const timestamp = new Date().toLocaleString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      this.messages.push({ timestamp, role: 'User', text });
    },
    addAction(action) {
      this.actions.push(action);
    },
  },
}
</script>

<style scoped>
.container {
  display: flex;
  height: 100vh;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
}
</style>
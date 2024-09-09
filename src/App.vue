<template>
  <div class="container">
    <Sidebar :actions="actions" />
    <div class="main">
      <ConversationLog :messages="messages" />
      <AudioStreamer />
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
      this.messages.push(text);
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
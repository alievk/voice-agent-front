<template>
  <div class="app-container">
    <div class="main-content">
      <ConversationLog 
        :messages="messages" 
        :isWarmingUp="!isReady" 
      />
      
      <MessageInput 
        :isRecordingUserAudio="isRecordingUserAudio"
        :isPlayingUserAudio="isPlayingUserAudio"
        :inputMode="inputMode"
        :buttonsEnabled="isReady"
        :userAudioFiles="userAudioFiles"
        @start-recording="startRecordingUserAudio"
        @stop-recording="stopRecordingUserAudio"
        @toggle-user-audio="toggleUserAudio"
        @send-text="sendTextMessage"
        @input-mode-change="mode => inputMode = mode"
        @system-message="addSystemMessage"
        @clean-messages="cleanMessages"
      />
    </div>

    <Sidebar 
      @activate-agent="handleActivateAgent" 
      :systemMessages="systemMessages"
      :agents="agents"
    />
  </div>
</template>

<script>
import Sidebar from './components/Sidebar.vue'
import ConversationLog from './components/ConversationLog.vue'
import MessageInput from './components/MessageInput.vue'
import { WebSocketManager } from './services/WebSocketManager.js'
import { AudioFilePlayer } from './services/AudioFilePlayer.js';
import { AudioStreamPlayer } from './services/AudioStreamPlayer.js';
import { AudioRecorder } from './services/AudioRecorder.js';

export default {
  components: {
    Sidebar,
    ConversationLog,
    MessageInput
  },
  
  data() {
    return {
      messages: [],
      systemMessages: [],
      selectedAgent: '',
      webSocketManager: new WebSocketManager(),
      isReady: false,
      audioFilePlayer: new AudioFilePlayer(),
      audioStreamPlayer: new AudioStreamPlayer(),
      audioRecorder: new AudioRecorder(),
      isRecordingUserAudio: false,
      isPlayingUserAudio: [false, false, false],
      currentUserAudioIndex: null,
      assistantAudioStartTime: null,
      interruptSpeechId: null,
      lastAssistantSpeechId: null,
      userAudioFiles: ["data/jfk_full.mp4", "data/what_is_strength.mp4", "data/virus_en.m4a"],
      inputMode: 'audio',
      agents: [],
    }
  },

  mounted() {
    this.agents = this.fetchAgents();
    this.handleActivateAgent(this.agents[0].name);
  },

  methods: {
    updateMessages(data) {
      const { role, content, timestamp, messageId } = data;

      const existingMessageIndex = this.messages.findIndex(m => m.messageId === messageId);
      if (existingMessageIndex !== -1) {
        this.messages[existingMessageIndex] = { ...this.messages[existingMessageIndex], ...data };
      } else {
        this.messages.push({
          role,
          content,
          timestamp,
          messageId
        });
      }
    },

    cleanMessages() {
      this.messages = [];
    },

    addSystemMessage(message) {
      this.systemMessages.push({
        id: Date.now(),
        content: message,
        timestamp: Date.now()
      });
    },

    handleActivateAgent(agentName) {
      this.selectedAgent = agentName;
      this.disconnect();
      this.cleanMessages();
      this.connect();
    },

    handleAudioMessage(audioData, metadata) {
      if (this.interruptSpeechId !== metadata.speech_id) {
        this.audioStreamPlayer.handleAudioData(audioData);
      }
      if (this.lastAssistantSpeechId !== metadata.speech_id) {
        this.addSystemMessage('New assistant speech started');
        this.assistantAudioStartTime = Date.now();
        this.interruptSpeechId = null;
      }
      this.lastAssistantSpeechId = metadata.speech_id;
    },

    handleJsonMessage(metadata) {
      this.addSystemMessage(`Received message from ${metadata.role}: ${metadata.content}`);
      this.updateMessages({
        role: metadata.role,
        content: metadata.content,
        timestamp: metadata.time,
        messageId: metadata.id
      });
      this.$emit('connection-established');
      this.isReady = true; // TODO: we need a special message from the server to know that the connection is established
    },

    async connect() {
      try {
        await this.webSocketManager.connect(window.location.hostname)
        this.webSocketManager.onAudioMessage = this.handleAudioMessage;
        this.webSocketManager.onJsonMessage = this.handleJsonMessage;
        this.webSocketManager.onSystemMessage = this.addSystemMessage;
        this.webSocketManager.sendJson({
          type: 'init',
          agent_name: this.selectedAgent
        });
        this.addSystemMessage('Connected to server');
      } catch (error) {
        console.error('Failed to connect to server:', error);
        this.addSystemMessage('Failed to connect to server');
      }
    },

    disconnect() {
      this.audioStreamPlayer.stop();
      this.webSocketManager.disconnect();
      this.isReady = false;
    },

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
          this.addSystemMessage('Started recording user audio');
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
      this.addSystemMessage('Stopped recording user audio');
    },

    sendTextMessage(message) {
      const textMessage = message.trim();
      if (!textMessage) return;
      this.webSocketManager.sendJson({
        type: 'manual_text',
        content: textMessage
      });
      this.$emit('system-message', `Sent text message: ${textMessage}`);
    },

    sendUserInterrupt() {
      if (!this.assistantAudioStartTime) return;
      const audioDuration = Date.now() - this.assistantAudioStartTime;
      this.webSocketManager.sendJson({ 
        type: 'interrupt',
        speech_id: this.lastAssistantSpeechId,
        interrupted_at_ms: audioDuration
      });
      this.interruptSpeechId = this.lastAssistantSpeechId;
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
          this.addSystemMessage(`Stopped playing user audio ${index + 1}`);
        });

        this.isPlayingUserAudio[index] = true;
        this.currentUserAudioIndex = index;
        this.addSystemMessage(`Playing user audio ${index + 1}`);
      } catch (error) {
        console.error('Error playing user audio:', error);
        this.addSystemMessage('Error playing user audio');
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

    fetchAgents() {
      // Simulated API call
      return [
        { name: 'Meeting at the bar', description: 'You meet a girl at the bar and she invites you to her place.' },
        { name: 'Luna: Sex Phone Operator', description: 'A phone sex operator ready to talk about anything.' },
        { name: 'Lovely Wife', description: 'A romantic and affectionate agent.' },
        { name: 'Sarcastic Marv', description: 'A witty and sarcastic agent.' },
      ];
    }
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

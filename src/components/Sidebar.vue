<template>
  <div class="app-sidebar">
    <div class="sidebar-content">
      <h4>Agent</h4>
      <select v-model="selectedAgent" @change="updateDescription">
        <option v-for="agent in agents" :key="agent.name" :value="agent.name">
          {{ agent.name }}
        </option>
      </select>
      <p>{{ agentDescription }}</p>
      <button @click="activateAgent">Activate Agent</button>
    </div>
    <SystemOutput :systemMessages="systemMessages" />
  </div>
</template>

<script>
import SystemOutput from './SystemOutput.vue'

export default {
  name: 'AppSidebar',
  components: {
    SystemOutput
  },
  props: {
    systemMessages: {
      type: Array,
      required: true
    }
  },
  data() {
    return {
      agents: [
        { name: 'Meeting at the bar', description: 'You meet a girl at the bar and she invites you to her place.' },
        { name: 'Luna: Sex Phone Operator', description: 'A phone sex operator ready to talk about anything.' },
        { name: 'Lovely Wife', description: 'A romantic and affectionate agent.' },
        { name: 'Sarcastic Marv', description: 'A witty and sarcastic agent.' },
      ],
      selectedAgent: '',
      agentDescription: ''
    };
  },
  created() {
    this.selectedAgent = this.agents[0].name;
    this.agentDescription = this.agents[0].description;
  },
  mounted() {
    this.activateAgent();
  },
  methods: {
    updateDescription() {
      const agent = this.agents.find(agent => agent.name === this.selectedAgent);
      this.agentDescription = agent ? agent.description : '';
    },
    activateAgent() {
      this.$emit('activate-agent', this.selectedAgent);
    }
  }
};
</script>

<style scoped>
.app-sidebar {
  width: 30%;
  min-width: 300px;
  max-width: 500px;
  background-color: #ffffff;
  padding: 30px;
  border-left: 1px solid #e9ecef;
  max-height: 100vh;
  box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1);
  font-family: 'Arial', sans-serif;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.sidebar-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 20px;
}

h4 {
  font-size: 24px;
  color: #333;
  margin: 0 0 20px 0;
  text-align: center;
}

select {
  width: 100%;
  padding: 15px;
  border: 2px solid #e1e1e1;
  border-radius: 12px;
  font-size: 16px;
  background-color: #f8f9fa;
  cursor: pointer;
  transition: all 0.2s ease;
}

select:hover {
  border-color: #3498db;
  background-color: #fff;
}

p {
  font-size: 16px;
  line-height: 1.5;
  color: #666;
  margin: 0;
  padding: 0 10px;
}

button {
  padding: 15px 30px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  border-radius: 25px;
  background-color: #3498db;
  color: white;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
  align-self: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

button:hover {
  background-color: #2980b9;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

button:active {
  transform: translateY(0);
}

ul {
  list-style-type: none;
  padding: 0;
  margin-top: 20px;
  width: 100%;
}

li {
  padding: 10px 0;
  border-bottom: 1px solid #dee2e6;
  color: #495057;
  font-size: 0.9rem;
}

li:last-child {
  border-bottom: none;
}
</style>

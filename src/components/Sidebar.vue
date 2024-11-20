<template>
  <div class="app-sidebar">
    <h4>Agent</h4>
    <select v-model="selectedAgent" @change="updateDescription">
      <option v-for="agent in agents" :key="agent.name" :value="agent.name">
        {{ agent.name }}
      </option>
    </select>
    <p>{{ agentDescription }}</p>
    <button @click="activateAgent">Activate Agent</button>
  </div>
</template>

<script>
export default {
  name: 'AppSidebar',
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
  width: 250px;
  background-color: #ffffff;
  padding: 20px;
  border-right: 1px solid #e9ecef;
  overflow-y: auto;
  height: 100vh;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
  font-family: 'Arial', sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
}

h4 {
  font-size: 1.2rem;
  color: #333;
  margin-bottom: 15px;
  font-weight: bold;
}

select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ced4da;
  border-radius: 10px;
  font-size: 1rem;
}

select:hover {
  background-color: #e9ecef;
  border-color: #adb5bd;
}

button {
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
  border-color: #3498db;
}

button:hover {
  background-color: #f0f7ff;
}

button.active {
  background-color: #3498db;
  color: white;
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

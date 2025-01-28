const fs = require('fs');
const path = require('path');
const { defineConfig } = require('@vue/cli-service');

module.exports = defineConfig({
  devServer: {
    server: {
      type: 'https',
      options: {
        key: fs.readFileSync(path.join(__dirname, 'key.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'cert.pem')),
      }
    },
    host: '127.0.0.1',
    port: 8501,
    allowedHosts: 'all',
    webSocketServer: false
  }
});
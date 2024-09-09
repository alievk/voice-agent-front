const fs = require('fs');
const path = require('path');
const { defineConfig } = require('@vue/cli-service');

module.exports = defineConfig({
  devServer: {
    server: {
      type: 'https',
      options: {
        key: fs.readFileSync(path.join(__dirname, 'localhost+2-key.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'localhost+2.pem')),
      }
    },
    host: '0.0.0.0',
    port: 8501,
    allowedHosts: 'all',
    https: true,
  }
});
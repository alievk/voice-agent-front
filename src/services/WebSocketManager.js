export class WebSocketManager {
  socket = null;
  onSystemMessage = null;
  onConnectionEstablished = null;
  onAudioMessage = null;
  onJsonMessage = null;

  connect = async (hostname, port) => {
    if (this.isConnected()) return;

    return new Promise((resolve, reject) => {
      const wsUrl = `wss://${hostname}:${port}`;
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.onConnectionEstablished?.();
        resolve();
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket connection error:', error);
        this.onSystemMessage?.('Connection error');
        reject(error);
      };

      this.socket.onclose = (event) => {
        const reason = this.getCloseReason(event.code);
        console.log(`WebSocket closed: ${reason}`);
        this.onSystemMessage?.(`Connection closed: ${reason}`);
      };

      setTimeout(() => {
        if (!this.isConnected()) {
          reject(new Error('WebSocket connection timed out'));
        }
      }, 5000);

      this.socket.onmessage = this.onMessage;
    });
  };

  disconnect = () => {
    if (this.socket) {
      this.socket.close(1000, "Normal closure");
      this.socket = null;
      console.log('WebSocket disconnected');
    }
  };

  isConnected = () => this.socket && this.socket.readyState === WebSocket.OPEN;

  send = (data) => {
    if (this.isConnected()) {
      try {
        this.socket.send(data);
      } catch (error) {
        console.error('Failed to send message:', error);
        this.onSystemMessage?.('Failed to send message');
      }
    } else {
      console.warn('Failed to send message because WebSocket is not connected');
      this.onSystemMessage?.('Failed to send message because WebSocket is not connected');
    }
  };

  sendJson = (data) => {
    try {
      this.send(JSON.stringify(data));
    } catch (error) {
      console.error('Failed to stringify message:', error);
      this.onSystemMessage?.('Failed to format message');
    }
  };

  onMessage = async (event) => {
    console.log('Message received');
    const arrayBuffer = await event.data.arrayBuffer();
    const dataView = new DataView(arrayBuffer);
    const metadataLength = dataView.getUint32(0);
    const metadata = JSON.parse(new TextDecoder().decode(arrayBuffer.slice(4, 4 + metadataLength)));
    const payload = arrayBuffer.slice(4 + metadataLength);

    if (metadata.type === 'audio') {
      console.log('Audio message received');
      this.onAudioMessage?.(payload, metadata);
    } else if (metadata.type === 'message') {
      console.log('JSON message received');
      this.onJsonMessage?.(metadata);
    } else {
      console.error('Unknown message type:', metadata.type);
    }
  };

  getCloseReason = (code) => {
    const codes = {
      1000: 'Normal closure',
      1001: 'Going away - client/server is disconnecting',
      1002: 'Protocol error',
      1003: 'Unsupported data',
      1004: 'Reserved',
      1005: 'No status received',
      1006: 'Abnormal closure - connection dropped',
      1007: 'Invalid frame payload data',
      1008: 'Policy violation',
      1009: 'Message too big',
      1010: 'Mandatory extension missing',
      1011: 'Internal server error',
      1012: 'Service restart',
      1013: 'Try again later',
      1014: 'Bad gateway',
      1015: 'TLS handshake failure'
    };
    return codes[code] || `Unknown code: ${code}`;
  };
}

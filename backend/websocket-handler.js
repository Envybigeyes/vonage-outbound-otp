// ===================================================================
// WEBSOCKET HANDLER - Real-time Updates
// ===================================================================

const WebSocket = require('ws');

class WebSocketHandler {
  constructor() {
    this.wss = null;
    this.clients = new Set();
  }

  initialize(app) {
    const server = app.listen ? app : null;
    if (!server) return;

    this.wss = new WebSocket.Server({ 
      noServer: true,
      path: '/ws'
    });

    server.on('upgrade', (request, socket, head) => {
      if (request.url === '/ws') {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });

    this.wss.on('connection', (ws) => {
      console.log('🔌 WebSocket client connected');
      this.clients.add(ws);

      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to monitoring system',
        timestamp: new Date().toISOString()
      }));

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          }
        } catch (error) {
          console.error('❌ WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        console.log('🔌 WebSocket client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        this.clients.delete(ws);
      });
    });

    console.log('✅ WebSocket initialized');
  }

  broadcast(data) {
    const message = JSON.stringify(data);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          console.error('❌ Broadcast error:', error);
        }
      }
    });
  }

  cleanup() {
    this.clients.forEach((client) => {
      try {
        client.close();
      } catch (error) {
        console.error('❌ Cleanup error:', error);
      }
    });
    this.clients.clear();
  }
}

module.exports = WebSocketHandler;

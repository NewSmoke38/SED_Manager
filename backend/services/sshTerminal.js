const { Client } = require('ssh2');

/**
 * Initialize WebSocket server for live SSH terminals
 */
function initialize(wss) {
  wss.on('connection', (ws, req) => {
    console.log('🔌 New WebSocket connection for SSH terminal');

    let sshClient = null;
    let sshStream = null;

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);

        if (data.type === 'connect') {
          // Connect to SSH
          const { host, port, username, password } = data;
          
          sshClient = new Client();
          
          sshClient.on('ready', () => {
            console.log('✅ SSH connection established');
            ws.send(JSON.stringify({ type: 'status', status: 'connected' }));

            sshClient.shell((err, stream) => {
              if (err) {
                ws.send(JSON.stringify({ type: 'error', error: err.message }));
                return;
              }

              sshStream = stream;

              stream.on('data', (data) => {
                ws.send(JSON.stringify({ type: 'data', data: data.toString() }));
              });

              stream.on('close', () => {
                ws.send(JSON.stringify({ type: 'status', status: 'disconnected' }));
                sshClient.end();
              });

              stream.stderr.on('data', (data) => {
                ws.send(JSON.stringify({ type: 'data', data: data.toString() }));
              });
            });
          });

          sshClient.on('error', (err) => {
            console.error('SSH error:', err.message);
            ws.send(JSON.stringify({ type: 'error', error: err.message }));
          });

          sshClient.connect({
            host,
            port,
            username,
            password,
            readyTimeout: 10000
          });
        } else if (data.type === 'input') {
          // Send input to SSH stream
          if (sshStream) {
            sshStream.write(data.data);
          }
        } else if (data.type === 'resize') {
          // Resize terminal
          if (sshStream) {
            sshStream.setWindow(data.rows, data.cols);
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('🔌 WebSocket connection closed');
      if (sshClient) {
        sshClient.end();
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      if (sshClient) {
        sshClient.end();
      }
    });
  });
}

module.exports = {
  initialize
};



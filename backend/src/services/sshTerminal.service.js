import { WebSocketServer } from 'ws';
import { Client } from 'ssh2';

export const createSSHTerminalServer = (port = 3001) => {
  const wss = new WebSocketServer({ port });
  
  console.log(`WebSocket SSH Terminal Server running on port ${port}`);
  
  wss.on('connection', (ws) => {
    console.log('New WebSocket connection established');
    
    let sshClient = null;
    let sshStream = null;
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        switch (data.type) {
          case 'connect':
            // Establish SSH connection
            sshClient = new Client();
            
            sshClient.on('ready', () => {
              console.log('SSH connection established');
              
              ws.send(JSON.stringify({
                type: 'status',
                status: 'connected'
              }));
              
              sshClient.shell((err, stream) => {
                if (err) {
                  console.error('Shell error:', err);
                  ws.send(JSON.stringify({
                    type: 'error',
                    error: 'Failed to open shell: ' + err.message
                  }));
                  return;
                }
                
                sshStream = stream;
                
                stream.on('close', () => {
                  console.log('SSH stream closed');
                  ws.send(JSON.stringify({
                    type: 'status',
                    status: 'disconnected'
                  }));
                  sshClient.end();
                }).on('data', (data) => {
                  // Send terminal output to WebSocket client
                  ws.send(JSON.stringify({
                    type: 'data',
                    data: data.toString()
                  }));
                });
                
                // Set initial terminal size
                if (data.rows && data.cols) {
                  stream.setWindow(data.rows, data.cols);
                }
              });
            }).on('error', (err) => {
              console.error('SSH connection error:', err);
              ws.send(JSON.stringify({
                type: 'error',
                error: 'SSH connection failed: ' + err.message
              }));
            }).on('close', () => {
              console.log('SSH connection closed');
              ws.send(JSON.stringify({
                type: 'status',
                status: 'disconnected'
              }));
            }).connect({
              host: data.host,
              port: data.port,
              username: data.username,
              password: data.password,
              readyTimeout: 10000,
              keepaliveInterval: 5000
            });
            break;
            
          case 'input':
            // Send user input to SSH stream
            if (sshStream) {
              sshStream.write(data.data);
            }
            break;
            
          case 'resize':
            // Resize terminal
            if (sshStream && data.rows && data.cols) {
              sshStream.setWindow(data.rows, data.cols);
            }
            break;
            
          default:
            console.log('Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('Error handling message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Failed to process request: ' + error.message
        }));
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket connection closed');
      
      // Clean up SSH connection
      if (sshStream) {
        sshStream.end();
      }
      if (sshClient) {
        sshClient.end();
      }
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      
      // Clean up SSH connection
      if (sshStream) {
        sshStream.end();
      }
      if (sshClient) {
        sshClient.end();
      }
    });
  });
  
  return wss;
};


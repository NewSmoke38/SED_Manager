import dotenv from "dotenv";
import connectDB from "./db/index.js";
import app from './app.js';
import { createSSHTerminalServer } from './services/sshTerminal.service.js';

dotenv.config({
    path: './.env'
});

const startServer = async () => {
  try {
    // Connect to MongoDB (optional - devices can work without it)
    try {
      await connectDB();
      console.log("MongoDB connected successfully");
    } catch (dbError) {
      console.log("MongoDB connection skipped - using in-memory storage");
    }

    app.on("error", (error) => {   
      console.log("ERROR", error);
      throw error;
    });

    // Start HTTP server
    const PORT = process.env.PORT || 8000;
    app.listen(PORT, () => {   
      console.log(`\n🚀 HTTP Server is running at port: ${PORT}`);
      console.log(`   API: http://localhost:${PORT}/api/devices`);
    });

    // Start WebSocket server for SSH terminals
    const WS_PORT = process.env.WS_PORT || 3001;
    createSSHTerminalServer(WS_PORT);
    console.log(`🔌 WebSocket Server running on port: ${WS_PORT}\n`);

  } catch (err) {
    console.log("Server startup failed:", err);
    process.exit(1);
  }
}

startServer();


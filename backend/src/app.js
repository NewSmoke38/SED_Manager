import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// routes imports
import userRouter from './routes/user.routes.js'
import deviceRouter from './routes/device.routes.js'

// routes declaration
app.use("/api/v1/users", userRouter);
app.use("/api/devices", deviceRouter);  // Unprotected device routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Secure Edge Device Manager API',
    timestamp: new Date().toISOString() 
  });
});

export default app;
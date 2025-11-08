import express from "express";
import cors from "cors";



const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// routes imports
import userRouter from './routes/user.routes.js'


// routes declaration
app.use("/api/v1/users", userRouter);

// http://localhost:8000/api/v1/users/register










export default app;
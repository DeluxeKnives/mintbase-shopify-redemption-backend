import express from 'express';
import mongoose from 'mongoose';
import { config } from 'dotenv';
import redemptionRouter from './routes/redemption.js';

config();
const app = express();
mongoose.connect(process.env.DATABASE_URL);
const db = mongoose.connection;

app.listen(3003, () => console.log("Server started"));
db.on('error', (error) => console.log(error));
db.once('open', () => console.log("Connected to database."));

app.use(express.json());
app.use("/redemption", redemptionRouter);
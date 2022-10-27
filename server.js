import express from 'express';
import mongoose from 'mongoose';
import { config } from 'dotenv';
import redemptionRouter from './routes/redemption.js';
import cors from 'cors';
import nearAPI from 'near-api-js';


config();
const app = express();

// Database
mongoose.connect(process.env.DATABASE_URL);
const db = mongoose.connection;

// Cors
app.use(cors({ origin: "*" }));

// Start server
app.listen(3003, () => console.log("Server started"));
db.on('error', (error) => console.log(error));
db.once('open', () => console.log("Connected to database."));

app.use(express.json());
app.use("/redemption", redemptionRouter);

// NEAR
const { connect, keyStores } = nearAPI;
const testnetAddition = process.env.NEAR_NETWORK === 'testnet' ? '.testnet' : '';
const connectionConfig = {
    networkId: process.env.NEAR_NETWORK,
    keyStore: new keyStores.InMemoryKeyStore(),
    nodeUrl: `https://rpc${testnetAddition}.near.org`,
    walletUrl: `https://wallet${testnetAddition}.near.org`,
    helperUrl: `https://helper${testnetAddition}.near.org`,
    explorerUrl: `https://explorer${testnetAddition}.near.org`,
};
export const connection = await connect(connectionConfig);
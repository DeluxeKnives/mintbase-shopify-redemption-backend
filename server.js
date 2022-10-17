import express from 'express';
import mongoose from 'mongoose';
import { config } from 'dotenv';
import redemptionRouter from './routes/redemption.js';
import Shopify, { ApiVersion } from '@shopify/shopify-api';

config();
const app = express();
mongoose.connect(process.env.DATABASE_URL);
const db = mongoose.connection;

const { API_KEY, API_SECRET_KEY, SCOPES, SHOP, HOST, HOST_SCHEME } = process.env;
Shopify.Context.initialize({
    API_KEY,
    API_SECRET_KEY,
    SCOPES: [SCOPES],
    HOST_NAME: HOST.replace(/https?:\/\//, ""),
    HOST_SCHEME,
    IS_EMBEDDED_APP: false,
    API_VERSION: ApiVersion.April22
});

app.listen(3003, () => console.log("Server started"));
db.on('error', (error) => console.log(error));
db.once('open', () => console.log("Connected to database."));

app.use(express.json());
app.use("/redemption", redemptionRouter);
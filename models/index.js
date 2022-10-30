import mongoose from "mongoose";

const nonceSchema = mongoose.Schema({
    nonce: {
        type: String,
        required: true
    },
    account: {
        type: String,
        required: true
    },
    date: {
        type: Number,
        required: true
    }
});

const redemptionSchema = mongoose.Schema({
    redeemed: {
        type: Boolean,
        required: true,
        default: false
    },
    nftId: {
        type: Number,
        required: true
    },
    redemptionCode: {
        type: String,
        required: false
    },
    checkoutLink: {
        type: String,
        required: false
    },
    redeemedDate: {
        type: Date,
        required: false
    }
});

const Nonce = mongoose.model('Nonce', nonceSchema);
const Redemption = mongoose.model('Redemption', redemptionSchema);

export { Nonce, Redemption };
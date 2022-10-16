import { Router } from "express";
import { Nonce, Redemption } from '../models/index.js';
import { v4 } from 'uuid';

const router = Router();

// Returns true if it has been redeemed, false if it has not
router.get('/check/:nftID', async (req, res) => {
    const nftID = parseInt(req.params.nftID);
    if(isNaN(nftID) || nftID < 0) res.status(400).json("Incorrect ID!");
    else {
        try {
            const redemption = await Redemption.find({ $where: `this.nftID==${nftID}` });
            res.status(200).json(redemption.get("id"));
        }
        catch (err) {
            res.status(200).json(false);
        }
    }
});

// Creates a Nonce, doesn't overwrite a previous one
router.post('/getNonce/:nftID', async (req, res) => {
    // Ensures that nftID is right
    const nftID = parseInt(req.params.nftID);
    if(isNaN(nftID) || nftID < 0) res.status(400).json("Incorrect ID!");

    // Generate nonce
    const nonce = v4();
    const nonceObj = new Nonce({ nonce, nftId: nftID });

    // Writes to database
    try {
        const newNonce = await nonceObj.save();
        res.status(201).json({ nonce, id: newNonce.id });
    }
    catch (err) {
        res.status(500).json(err);
    }
});

// Redeem
router.post('/redeemMirror', (req, res) => {

    // Check that nonce is right, & delete all nonces of user

    // Check for redemption

    // Generate code via shopify

    // Set in db what the code was & that it was redeemed

    // Return

});


export default router;
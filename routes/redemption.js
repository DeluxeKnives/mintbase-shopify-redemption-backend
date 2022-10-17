import { Router } from "express";
import { Nonce, Redemption } from '../models/index.js';
import { v4 } from 'uuid';
import axios from 'axios';

const router = Router();

// Returns true if it has been redeemed, false if it has not
router.get('/check/:nftID', async (req, res) => {
    const nftID = parseInt(req.params.nftID);
    if (isNaN(nftID) || nftID < 0) res.status(400).json("Incorrect ID!");
    else {
        try {
            const redemption = await Redemption.find({ $where: `this.nftID==${nftID}` });
            res.status(200).json(redemption.get(redeemed));
        }
        catch (err) {
            res.status(200).json(false);
        }
    }
});

// Creates a Nonce, doesn't overwrite a previous one
router.get('/getNonce/:nftID', async (req, res) => {
    // Ensures that nftID is right
    const nftID = parseInt(req.params.nftID);
    if (isNaN(nftID) || nftID < 0) res.status(400).json("Incorrect ID!");

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
router.post('/redeemMirror', async (req, res) => {
    // Get data
    const id = req.body.id;
    const nftID = req.body.nftID;
    if (id == null || nftID == null) {
        res.status(400).json("Incorrect ID!");
        return;
    }

    // Check for redemption
    let redeemed = false;
    try {
        const redemption = await Redemption.find({ $where: `this.nftID==${nftID}` });
    }
    catch (err) {
        redeemed = false;
    }
    if (redeemed) {
        res.status(400).json("NFT already redeemed!");
        return;
    }

    // Check that nonce is right, & delete all nonces of user
    const nonce = await Nonce.findById(id);
    const getAnnouncement = "GET ANNOUNCEMENT FROM NEAR BLOCKCHAIN";
    if (false ) {//nonce.nonce != getAnnouncement) { //TODO: GET ANNOUNCEMENT
        res.status(400).json("Nonce not announced properly!");
        return;
    }
    // TODO: delete user nonces

    // Generate code via shopify
    const priceRuleId = 507328175; // TODO: generate correct price rule from mintbase info
    const redemptionCode = "NFT-" + v4().slice(0, 15)
    try {
        // Creates a price rule for this specific user
        let shopifyRes = await axios.post(
            `https://${process.env.SHOPIFY_DOMAIN}/admin/api/2022-10/price_rules.json`, 
            {
                'title': redemptionCode,
                "value_type":"percentage",
                "value":"-100.0",
                "customer_selection":"all",
                "target_type":"line_item",
                "target_selection":"entitled",
                "allocation_method":"each",
                "starts_at":"2018-03-22T00:00:00-00:00",
                "entitled_product_ids":[4670662017099], // TODO: get from mintbase info
                "allocation_limit": 1,
                "once_per_customer": true,
                "usage_limit": 1
            },
            {
                headers: {
                    'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_CODE,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log(shopifyRes);

        // Creates a discount code
        shopifyRes = await axios.post(
            `https://${process.env.SHOPIFY_DOMAIN}/admin/api/2022-10/price_rules/${priceRuleId}/discount_codes.json`, 
            {
                'discount_codes': [{ 'code': redemptionCode }]
            },
            {
                headers: {
                    'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_CODE,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log(shopifyRes);
    }
    catch (err) {
        res.status(500).json(err);
        return;
    }

    // Set in db what the code was & that it was redeemed
    try {
        const redemption = new Redemption({
            redemptionCode,
            nftId: nftID,
            redeemed: true,
            redeemedDate: Date.now()
        });
        redemption.save();
    }
    catch {
        res.status(500).json(err);
    }

    // Return
    res.status(201).json({
        succcess: true,
        redemptionCode: discount_code.code
    });
});

// Get redemption code


export default router;
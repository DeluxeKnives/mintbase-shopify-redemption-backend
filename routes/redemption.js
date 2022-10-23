import { json, Router } from "express";
import { Nonce, Redemption } from '../models/index.js';
import { v4 } from 'uuid';
import axios from 'axios';
import sanitizer from 'express-autosanitizer';
import nearApi from "near-api-js";
import { sha256 } from "js-sha256";

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
router.post('/redeemMirror', sanitizer.route, async (req, res) => {
    // Get data
    const id = req.body.id;
    const nftID = req.body.nftID;
    const accountId = req.body.accountId;
    const password = req.body.password;
    let { signature, publicKey } = password;
    signature = Uint8Array.from(Object.values(signature))
    publicKey = Uint8Array.from(Object.values(publicKey.data))

    if (id == null || signature == null || publicKey == null || nftID == null || accountId == null) {
        res.status(400).json("Incorrect ID!");
        return;
    }

    // Get sign data from rpc
    const { data } = await axios({
        method: 'post',
        url: 'https://rpc.testnet.near.org',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        data: `{"jsonrpc":"2.0", "method":"query",
                "params":["access_key/${accountId}", ""], "id":1}`
    });
    if (!data || !data.result || !data.result.keys) {
        res.status(400).json("No data for accountId found!");
        return;
    }

    console.log(signature);
    console.log(publicKey);

    for (const k in data.result.keys) {
        const rpcPublicKey = nearApi.utils.key_pair.PublicKey.from(data.result.keys[k].public_key);
        const verification = rpcPublicKey.verify(Uint8Array.from("BADASS MESSAGE"), signature);
        console.log("PUBLIC KEY:", data.result.keys[k].public_key, verification);
    }



    // Check that nonce is right, & delete all nonces of user
    /*
    const nonce = await Nonce.findById(id);
    const getSignedData = "GET ANNOUNCEMENT FROM NEAR BLOCKCHAIN";
    if (true) {//nonce.nonce != getAnnouncement) { //TODO: GET ANNOUNCEMENT
        res.status(400).json(data);
        return;
    }
    // TODO: delete user nonces



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
    */

    // Generate code via shopify
    const redemptionCode = "NFT-" + v4().slice(0, 15)
    const productId = 4483561226315; // TODO: get from mintbase info
    try {

        let productRes = await axios.get(
            `https://${process.env.SHOPIFY_DOMAIN}/admin/api/2022-10/products/${productId}.json`,
            {
                headers: {
                    'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_CODE,
                    'Content-Type': 'application/json'
                }
            }
        );

        const price = parseFloat(productRes.data.product.variants[0].price);

        // Creates a price rule for this specific user
        let shopifyRes = await axios.post(
            `https://${process.env.SHOPIFY_DOMAIN}/admin/api/2022-10/price_rules.json`,
            {
                "price_rule": {
                    "allocation_method": "across",
                    "customer_selection": "all",
                    'title': redemptionCode,
                    "value_type": "fixed_amount",
                    "value": -price,
                    "target_type": "line_item",
                    "target_selection": "entitled",
                    "starts_at": "2018-03-22T00:00:00-00:00",
                    "entitled_product_ids": [productId], 
                    "allocation_limit": 1,
                    "once_per_customer": true,
                    "usage_limit": 1
                }
            },
            {
                headers: {
                    'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_CODE,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log(shopifyRes.data.price_rule.id);

        // TODO: generate correct price rule from mintbase info
        const priceRuleId = shopifyRes.data.price_rule.id;

        // Creates a discount code
        shopifyRes = await axios.post(
            `https://${process.env.SHOPIFY_DOMAIN}/admin/api/2022-10/price_rules/${priceRuleId}/discount_codes.json`,
            {
                'discount_code': {
                    'code': redemptionCode
                }
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
        redemptionCode
    });
});

/*
async function verifySignature(nonce, accountId) {
    const keyPair = await keyStore.getKey(process.env.NEAR_NETWORK, accountId);
    const msg = Buffer.from(nonce);

    const { signature } = keyPair.sign(msg);

    const isValid = keyPair.verify(msg, signature);

    console.log("Signature Valid?:", isValid);

    return isValid
}
*/

// Get redemption code


export default router;
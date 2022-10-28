import { json, Router } from "express";
import { Nonce, Redemption } from '../models/index.js';
import { v4 } from 'uuid';
import axios from 'axios';
import sanitizer from 'express-autosanitizer';
import nearApi from "near-api-js";
import { sha256 } from "js-sha256";
import { connection } from "../server.js";

const router = Router();

// Returns true if it has been redeemed, false if it has not
router.get('/check/:nftID', async (req, res) => {
    const nftID = parseInt(req.params.nftID);
    if (isNaN(nftID) || nftID < 0) res.status(400).json("Incorrect ID!");
    else {
        try {
            const redemption = await Redemption.find({ nftId: nftID });
            console.log(redemption);
            res.status(200).json(redemption[0].redeemed);
        }
        catch (err) {
            console.log(err);
            res.status(200).json(false);
        }
    }
});

// Returns a dictionary of nftIDs to booleans. Submit nftIDs like 0,1,2,5,10
router.get('/checkBatch/:nftIDs', async (req, res) => {
    const nftIdStr = req.params.nftIDs;
    const input = nftIdStr.split(",");

    const nftIds = [];
    input.forEach(i => {
        nftIds.push(parseInt(i));
    });

    console.log(input);

    const status = {};
    for (const id of nftIds) {
        if (isNaN(id) || id < 0) { 
            res.status(400).json("Incorrect ID!");
            return;
        }
        else status[id] = false;
    }

    try {
        const redemption = await Redemption.find({ nftId: nftIds });
        for (const obj of redemption) {
            status[obj.nftId] = obj.redeemed;
        }
        res.status(200).json(status);
    }
    catch (err) {
        console.log(err);
        res.status(400).json(false);
    }
});

// Creates a Nonce for a specific NFT ID; doesn't overwrite a previous one
router.get('/getNonce/:nftID', async (req, res) => {
    // Ensures that nftID is right
    const nftID = parseInt(req.params.nftID);
    if (isNaN(nftID) || nftID < 0) res.status(400).json("Incorrect ID!");

    // Generate nonce
    const nonce = v4();
    const nonceObj = new Nonce({ nonce, nftId: nftID, date: Date.now() });

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
    const nonceId = req.body.id;
    const nftID = req.body.nftID;
    const accountId = req.body.accountId;
    const password = req.body.password;
    let { signature, publicKey } = password;
    signature = Uint8Array.from(Object.values(signature))
    publicKey = Uint8Array.from(Object.values(publicKey.data))

    if (nonceId == null || signature == null || publicKey == null || nftID == null || accountId == null) {
        res.status(400).json("Incorrect ID!");
        return;
    }

    // Get sign data from rpc
    // https://github.com/near/near-api-js/blob/7f16b10ece3c900aebcedf6ebc660cc9e604a242/packages/near-api-js/src/account.ts#L541
    const nearAccount = await connection.account(accountId);
    const accessKeys = await nearAccount.getAccessKeys();

    if (!accessKeys || !accessKeys.length <= 0) {
        res.status(400).json("No data for accountId found!");
        return;
    }

    // Check for the keys
    let verification = false;
    for (const k in accessKeys) {
        const rpcPublicKey = nearApi.utils.key_pair.PublicKey.from(accessKeys[k].public_key);
        const v = rpcPublicKey.verify(new Uint8Array(sha256.array("123456789")), signature);

        if (v) {
            verification = v;
            console.log(accountId + " verified with public key:", accessKeys[k].public_key);
            break;
        }
    }
    if (!verification) {
        console.log("ERROR!")
        res.status(403).json("Incorrect signature!");
        return;
    }

    // Check that nonce is right, & delete all nonces of user

    const nonce = await Nonce.findById(nonceId);
    const getSignedData = "GET ANNOUNCEMENT FROM NEAR BLOCKCHAIN";
    if (true) {//nonce.nonce != getAnnouncement) { //TODO: GET ANNOUNCEMENT
        res.status(400).json(accountId);
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


    // Query data from Mintbase
    const mintbaseRes = await axios.post(
        `https://interop-${process.env.NEAR_NETWORK}.hasura.app/v1/graphql`,
        {
            query:
                `query { 
                 mb_views_nft_tokens(
                    where: { token_id: { _eq: "${nftID}" }, nft_contract_id: { _eq: "${process.env.MINTBASE_SHOP}" } }
                    offset: 0
                 )
                 {
                  token_id
                  reference_blob
                 }
            }`
        },
        {
            headers: {
                'Content-Type': 'application/json',
            },
        }
    );
    console.log(mintbaseRes.data);
    console.log(mintbaseRes.data.data.mb_views_nft_tokens);

    return;

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


// DELETE LATER, FOR TESTING PURPOSES ONLY
router.get('/setRedeemed/:nftID', async (req, res) => {
    const nftId = parseInt(req.params.nftID);
    const obj = new Redemption({
        redeemed: true,
        nftId,
        redemptionCode: "XXX-XXX-XXX",
        redeemedDate: Date.now()
    });

    await obj.save();

    res.status(200).json(obj);
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
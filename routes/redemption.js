import { Router } from "express";
import { Nonce, Redemption } from '../models/index.js';
import { v4 } from 'uuid';
import Shopify from "@shopify/shopify-api";
import { DiscountCode } from '@shopify/shopify-api/dist/rest-resources/2022-10/index.js';

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

// Shopify login
router.get('/shopify/login', async (req, res) => {
    let authRoute = await Shopify.Auth.beginAuth(
        req,
        res,
        process.env.SHOPIFY_DOMAIN,
        '/redemption/shopify/callback',
        false,
    );
    return res.redirect(authRoute);
});
router.get('/shopify/callback', async (req, res) => {
    try {
        const session = await Shopify.Auth.validateAuthCallback(
            req,
            res,
            req.query //as unknown as AuthQuery
        ); // req.query must be cast to unknown and then AuthQuery in order to be accepted

        activeShopifyShop = session;
        console.log(session.accessToken);
    } catch (error) {
        console.error(error); // in practice these should be handled more gracefully
    }
});
let activeShopifyShop;

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
    //const test_session = await Utils.loadCurrentSession(request, response); //TODO: proper setup
    const test_session = activeShopifyShop;
    console.log(test_session);
    const discount_code = new DiscountCode({ session: test_session });
    discount_code.price_rule_id = 507328175;
    discount_code.code = "NFT-" + v4().slice(0, 15);
    await discount_code.save({
        update: true,
    });

    // Set in db what the code was & that it was redeemed
    try {
        const redemption = new Redemption({
            redemptionCode: discount_code.code,
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
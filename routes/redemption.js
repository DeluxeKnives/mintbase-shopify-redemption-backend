import { Router } from "express";

const router = Router();

// Returns true if it has been redeemed, false if it has not
router.get('/check/:id', (req, res) => {
    const id = parseInt(req.params.id);
    if(isNaN(id) || id < 0) res.status(400).json("Incorrect ID!");
    else {
        // Attempt get from database
        res.status(200).json(true);
    }
});

// Get Nonce


// Redeem


export default router;
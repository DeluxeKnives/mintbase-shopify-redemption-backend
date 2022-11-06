# NEAR Redemption Backend
This repository is an express backend that utilizes Mintbase's NFT infrastructure & Shopify's ecommerce solution together to allow NFT redemptions for physical items.  
Every NFT can generate one discount code equal to the current price of the item that it correlates to. It cannot create additional discount codes, even after being sold on secondary markets.  

The discount code generation has the following properties:
- Discount amount equal to the current price of the shopify product ID (not by percentage)
- Can only be used for the specific product ID
- Can only be used once per person
- Can only be used by one person

## Setup
1. Run `npm install` to install all dependencies.
2. Run `npm start` to begin the server.

## Deployment & Use
This repository depends on MongoDB, Mintbase GraphQL API, and the Shopify API. To get all of these systems working together properly, please follow the GitBook guide.

## NFT Metadata Setup
When generating your NFT, it should have the following metadata provided by Mintbase. The only required one is `shopify_productId`, which should be equal to the shopify productId that the NFT correlates to. This system currently does not support the discounting of specific product variants.  
If you are attempting to add this system to NFTs that already exist, you will have to wait for following updates, where NFT to productId mappings will be stored in the MongoDB database instead of on-chain.  
```
{
    type: "bayonet",
    shopify_productId: 124567,
}
```
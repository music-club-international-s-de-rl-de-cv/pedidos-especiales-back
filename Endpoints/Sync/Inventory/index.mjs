import "@shopify/shopify-app-remix/adapters/node";
import "@shopify/shopify-api/adapters/node";
import { ApiVersion } from "@shopify/shopify-api";
import { createAdminApiClient } from "@shopify/admin-api-client";
// import { MongoQuery } from '@music-club-international-s-de-rl-de-cv/query'
import fetch from 'node-fetch';
import mongoose from 'mongoose';

const URLEpcior = process.env.API_115_URL_BASE
const connectToMongo = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log("[ ✅ Conectado a MongoDB ]");
    } catch (error) {
        console.error(">> ⛔ Error al conectar con MongoDB <<", error);
        throw error;
    }
};

const shopifyClients = new Map();

const getShopifyClient = async (hostname, accessToken) => {
    const cacheKey = `${hostname}_${accessToken}`;
    console.log('cacheKey==', cacheKey)
    console.log('URLEpcior==',URLEpcior)
    if (shopifyClients.has(cacheKey)) {
        return shopifyClients.get(cacheKey);
    }
    const client = createAdminApiClient({
        storeDomain: hostname,
        accessToken: accessToken,
        apiVersion: ApiVersion.January26
    });

    shopifyClients.set(cacheKey, client);

    return client;
}

const GetProducts = async (client, itemsforpage, token) => {
    let var_mutation = {
        "first": itemsforpage,
        "after": token
    }

    const query = `
        query GetProducts($first: Int!, $after) {
            products(first: $first, after: $after) {
                edges {
                    node {
                        id
                        title
                        handle
                        status
                        productType
                        vendor
                        variants(first: 100) {
                            edges {
                                node {
                                    id
                                    title
                                    sku
                                    barcode
                                    inventoryQuantity
                                    price
                                    inventoryItem {
                                        id
                                        tracked
                                        inventoryLevels(first: 10) {
                                            edges {
                                                node {
                                                    id
                                                    location {
                                                        id
                                                        name
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                pageInfo {
                    hasNextPage
                    endCursor
                }
            }
        }`;
    let getItems = await client.request(query, { variables: var_mutation });
    console.log('getItems==', getItems)
    const { edges, pageInfo } = getItems.data.products
    const { hasNextPage, endCursor } = pageInfo
    edges.map(async (item) => {
        const { node: { id, title, status, vendor, productType, variants: { edges: _variants } } } = item

        _variants.map(async (_sub) => {
            const { node: { id: variantId, inventoryQuantity: quantity, sku, inventoryItem: { id: inventoryItemID, inventoryLevels } } } = _sub
            const { id: idInvLev, location: { id: idLocation, name: locationName } } = inventoryLevels.edges[0].node
            let save_productDB = {
                id: id,
                title: title,
                status: status,
                vendor: vendor,
                productType: productType,
                variantId: variantId,
                quantity: quantity,
                sku: sku,
                inventoryItemID: inventoryItemID,
                idInvLev: idInvLev,
                idLocation: idLocation,
                locationName: locationName
            }

            // let query = new MongoQuery([{ field: 'sku', value: sku }], { offset: 0, limit: 100 }, {})
            let exist = await sellerItem.find({ "sku": sku })
            if (exist.length) {
                console.log('exist.length==', exist.length)
                if (exist[0].quantity != quantity) {
                    console.log('update', sku, "| previous stock: ", exist[0].quantity, "| new stock: ", quantity)
                    await sellerItem.updateOne(query, { quantity: quantity })
                }

            } else {
                await sellerItem.insertOne(save_productDB)
            }
        })
    })


    return { hasNextPage, endCursor }

}

const SetInventary = async (client, inventoryItem_Id, locationItemId, quantity, oldQuantity, reason = "correction") => {
    const mutation = `
        mutation InventorySet($input: InventorySetQuantitiesInput!) {
            inventorySetQuantities(input: $input) {
                inventoryAdjustmentGroup {
                    createdAt
                    reason
                    referenceDocumentUri
                    changes {
                        name
                        delta
                    }
                }
                userErrors {
                    field
                    message
                }
            }
        }`;
    let var_mutation = {
        "input": {
            "name": "available",
            "reason": reason,
            "quantities": [
                {
                    "inventoryItemId": inventoryItem_Id,
                    "locationId": locationItemId,
                    "quantity": quantity,
                    "compareQuantity": oldQuantity
                }
            ]
        }
    };

    let getItems = await client.request(mutation, { variables: var_mutation });
    if (getItems.errors) {
        return { status: false, message: getItems.errors.message }
    } else {
        const { inventorySetQuantities: { inventoryAdjustmentGroup: AdjustmentGroup, userErrors } } = getItems.data

        if (AdjustmentGroup && AdjustmentGroup != null && AdjustmentGroup.changes.length) {
            return { status: true, message: 'success' }
        } else {
            const { message } = userErrors[0]
            return { status: false, message: message }
        }
    }


}

export const handler = async (event) => {
    await connectToMongo();
    const { HOSTNAME_SHOPIFY_DEV, ACCESSTOKEN_SHOPIFY_DEV } = process.env
    const client = await getShopifyClient(HOSTNAME_SHOPIFY_DEV, ACCESSTOKEN_SHOPIFY_DEV)

    let breakWhile = true;
    let after = null, itemsforpage = 50
    // let items = {
    //     sendToZero: [],
    //     sendToUpdate: [],
    //     equalItems: []

    // }, finalCountProcess  = {
    //     totalSend: 0,
    //     success: 0,
    //     error: 0,
    //     errorDetail: []
    // };

   const response = await fetch(`${URLEpcior}/api/inventory/get/sp`);
//    console.log('response==',response)
const request = (await response.json()).data;
     console.log('request==', request)
    do {
        let nextItem = await GetProducts(client, itemsforpage, after)
        const { hasNextPage, endCursor } = nextItem
        breakWhile = hasNextPage
        after = endCursor
        await new Promise(resolve => setTimeout(resolve, 1500));
    } while (breakWhile)

    let exist = await sellerItem.find()
    console.log('exist==', exist[0])
    console.log("====================")
   
    // for (let item of exist.filter((el) => el.status == "ACTIVE")) {
    //         const { sku, inventoryItemID, idLocation, quantity } = item
    //         let _equals = _sp.find((element) => element.partNum == item.sku)
    //         let body = {
    //             sku,
    //             inventoryItemID,
    //             idLocation,
    //             oldQuantity: quantity
    //         }
    //         if (_equals != undefined) {
    //             Object.assign(body, { quantity: _equals.Disponible })
    //             if (_equals.Disponible != item.quantity) {
    //                 items.sendToUpdate.push({ ...body })
    //             } else {
    //                 items.equalItems.push({ ...body })
    //             }
    //         } else {
    //             if (quantity != 0) {
    //                 Object.assign(body, { quantity: 0 })
    //                 items.sendToUpdate.push({ ...body })
    //             } else { items.equalItems.push({ ...body }); }

    //         }
    //     }

}
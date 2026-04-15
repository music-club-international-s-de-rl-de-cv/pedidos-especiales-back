import "@shopify/shopify-app-remix/adapters/node";
import "@shopify/shopify-api/adapters/node";
import { ApiVersion } from "@shopify/shopify-api";
import { createAdminApiClient } from "@shopify/admin-api-client";
// import { MongoQuery } from '@music-club-international-s-de-rl-de-cv/query'
import fetch from 'node-fetch';
import { InventoryModel as sellerItem } from './models/Inventory.mjs'
import ProcessModel from './models/process.mjs'
import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import { DateTime } from 'luxon'
import { v4 as uuidv4 } from 'uuid';

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
        query GetProducts($first: Int!, $after: String) {
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

    if (getItems.errors) {
        console.log('GraphQL errors:', JSON.stringify(getItems.errors.graphQLErrors, null, 2));
        throw new Error(getItems.errors.message);
    }
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
            try {
                // let query = new MongoQuery([{ field: 'sku', value: sku }], { offset: 0, limit: 100 }, {})
                const exist = await sellerItem.find({ sku: sku });
                if (exist.length) {
                    if (exist[0].quantity != quantity) {
                        console.log('update', sku, "| previous stock: ", exist[0].quantity, "| new stock: ", quantity)
                        await sellerItem.updateOne(
                            { sku: sku },
                            {
                                $set: {
                                    quantity: quantity
                                }
                            }
                        )
                    }

                } else {
                    await sellerItem.create(save_productDB);
                }
            } catch (error) {
                console.log('save_productDB==', save_productDB)
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
    const { userName } = event.queryStringParameters ?? {};
    const res_inv = await fetch(`${URLEpcior}/run/db/save/inventory`);
    const req_inv = (await res_inv.json()).data;
    console.log('req_inv==',req_inv)
    await connectToMongo();
    const { HOSTNAME_SHOPIFY_DEV, ACCESSTOKEN_SHOPIFY_DEV } = process.env
    const client = await getShopifyClient(HOSTNAME_SHOPIFY_DEV, ACCESSTOKEN_SHOPIFY_DEV)

    let breakWhile = true;
    let after = null, itemsforpage = 50
    let items = {
        sendToZero: [],
        sendToUpdate: [],
        equalItems: []
    }, finalCountProcess = {
        totalSend: 0,
        success: 0,
        error: 0,
        errorDetail: []
    };

    const response = await fetch(`${URLEpcior}/api/inventory/get/sp`);
    const request = (await response.json()).data;
    // do {
    //     let nextItem = await GetProducts(client, itemsforpage, after)
    //     const { hasNextPage, endCursor } = nextItem
    //     breakWhile = hasNextPage
    //     after = endCursor
    //     await new Promise(resolve => setTimeout(resolve, 200));
    // } while (breakWhile)

    let exist = await sellerItem.find()

    console.log('exist==', exist[0])
    for (let item of exist.filter((el) => el.status == "ACTIVE")) {
        const { sku, inventoryItemID, idLocation, quantity } = item
        let _equals = request.find((element) => element.PartNum == item.sku || element.SKU_c == item.sku)
        // console.log('_equals==',_equals)
        let body = {
            sku,
            inventoryItemID,
            idLocation,
            oldQuantity: quantity
        }
        if (_equals != undefined) {
            Object.assign(body, { quantity: _equals.Disponible })
            if (_equals.Disponible != item.quantity) {
                items.sendToUpdate.push({ ...body })
            } else {
                items.equalItems.push({ ...body })
            }
        } else {
            if (quantity != 0) {
                Object.assign(body, { quantity: 0 })
                items.sendToUpdate.push({ ...body })
            } else { items.equalItems.push({ ...body }); }

        }
    }

    if (items.sendToUpdate.length != 0) {
        for (let item of items.sendToUpdate) {
            const { inventoryItemID, idLocation, oldQuantity, quantity, sku } = item
            let response = await SetInventary(client, inventoryItemID, idLocation, quantity, oldQuantity)
            finalCountProcess.totalSend++
            const { status, message } = response
            if (status) { finalCountProcess.success++; }
            else {
                finalCountProcess.error++;
                finalCountProcess.errorDetail.push({ sku, msm_err: message })
            }

            response_excel.push({ sku, "previous stock": oldQuantity, "new stock": quantity, "details": message })
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }
    ProcessModel.CREATE({
        processId: uuidv4(),
        process: response_excel,
        createdAt: DateTime.now().setZone("America/Mexico_City").toFormat("yyyy-MM-dd HH:mm:ss"),
        user_system: userName,
        taskName: 'STOCK'
    })
    return {
        statusCode: 200,
        // body: JSON.stringify(result)
        body: 'ok'
    }
}
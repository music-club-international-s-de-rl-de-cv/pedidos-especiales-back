import sanitizatier, { removeDuplicate,locationMarketplace } from '@music-club-international-s-de-rl-de-cv/epicor-structure-api'
import fetch from 'node-fetch';
import ErrorModel from './models/Error.mjs';
import OrderModel from './models/OrderStatus.mjs'
// import mongoose from 'mongoose';

let headers = {
    'x-api-key': process.env.API_KEY_DEV_EPICOR,
    Authorization: process.env.AUTH_GET_DESC_SP,
    'Content-Type': 'application/json'
}
let URL_EPICOR = process.env.URI_DEV_EPICOR
let CUSTOM_NUM = 3903

if (process.env.ENVIRONMENT === 'production') {
    headers = {
        'x-api-key': process.env.API_KEY_PROD_EPICOR,
        Authorization: process.env.AUTH_GET_DESC_SP,
        'Content-Type': 'application/json'
    }
    URL_EPICOR = process.env.URI_PROD_EPICOR
    CUSTOM_NUM = 5314
}

const createHeader = async (orderShopify) => {
    try {
        const { body, OrderComment, CUST_NUM, MAIL_LIST, _sData } = await sanitizatier.createHeaderBody(orderShopify, 'shopify', process.env.DEVELOP_ENV)
        const { orderID, items } = _sData
        let _aunt = ''
        // const exitsOrder = await fecthSqlOrderData(orderID)
        let newOrderPass = true
        // if (process.env.DEVELOP_ENV === 'PROD') {
        //     if (exitsOrder[0]?.orderNum == undefined) { newOrderPass = false }
        // }

        if (newOrderPass) {
            console.log('[ ⛔  NO EXITE ID DE PEDIDO EN EPICOR ⛔ ]')

            const request = await fetch(`${URL_EPICOR}/api/v2/odata/HMMX/Erp.BO.SalesOrderSvc/SalesOrders`, {
                method: 'POST',
                headers,
                body: await JSON.stringify(body)
            });
            const response = await request.json();

            if (response.error) {
                await ErrorModel.create({
                    order_id: orderID,
                    error_epicor: "ERROR EN EL ENCABEZADO DEL RESPONSE",
                    error_detail: response.error,
                    marketplace: "shopify"
                });
                return { ov_epicor: null, internal_state: false };
            }

            const orderNum = response.OrderNum;

            console.log(`[ OrderNum ] >> ${orderNum} <<`);

            let bodyDetail = await sanitizatier.createDetailBody(response.OrderNum, items, 'shopify', process.env.DEVELOP_ENV, CUST_NUM, OrderComment, process.env.AUTH_GET_DESC_SP, process.env.API_KEY_PROD_EPICOR, process.env.URI_PROD_EPICOR)
            for (let _detail of bodyDetail) {
                const detalleSuccess = await createDetail(orderID, _detail);
                if (!detalleSuccess) {
                    return { ov_epicor: orderNum, internal_state: false };
                }
            }

            return { ov_epicor: orderNum, internal_state: true };
        } else {
            console.log(`[ ✅  SI EXITE EL ${orderID} DE PEDIDO EN EPICOR || OV: ${exitsOrder[0]?.orderNum} ✅ ]`)
            return { ov_epicor: exitsOrder[0]?.orderNum, internal_state: true };
        }
    } catch (error) {
        console.error("Error en createHeader:", error);
        return { ov_epicor: null, internal_state: false };
    }
}

const createDetail = async (orderID, bodyDetail) => {
    try {
        const { OrderNum, OrderLine: line, SellingQuantity: quantity } = bodyDetail
        let body = {};
        body = JSON.stringify(bodyDetail);

        const request = await fetch(`${URL_EPICOR}/api/v2/odata/HMMX/Erp.BO.SalesOrderSvc/OrderDtls`, {
            method: 'post',
            headers,
            body
        });

        const response = await request.json();

        if (response.error) {
            await ErrorModel.create({
                order_id: orderID,
                error_epicor: "ERROR EN EL DETALLE DEL RESPONSE",
                error_detail: response.error,
                marketplace: "shopify"
            });
            return false;
        }

        console.log('detalle ', line, '[ OK ✅ ]');

        const realizeBody = await sanitizatier.createRealizeBody(OrderNum, 'shopify', line, quantity, CUSTOM_NUM, "WEB", "WEB")
        // const realizeBody = await sanitizatier.createRealizeBody(OrderNum, 'shopify', line, quantity)
        const realizeSuccess = await createRealize(realizeBody, orderID);
        if (!realizeSuccess) return false;

        return true;
    } catch (err) {
        console.error("Error en createDetail:", err);
        return false;
    }
};

const createRealize = async (reBody, orderID) => {
    try {
        const { OrderLine: line } = reBody
        const request = await fetch(`${URL_EPICOR}/api/v2/odata/HMMX/Erp.BO.SalesOrderSvc/OrderRels`, {
            method: 'post',
            headers,
            body: JSON.stringify(reBody)
        });

        const response = await request.json();

        if (response.error) {
            await ErrorModel.create({
                order_id: orderID,
                error_epicor: "ERROR EN EL REALIZE DEL RESPONSE",
                error_detail: response.error,
                marketplace: "shopify"
            });
            return false; // ⛔ Falla
        }

        console.log('realize ', line, '[ OK ✅ ]');
        return true; // ✅ Todo bien
    } catch (err) {
        console.error("Error en createRealize:", err);
        return false;
    }

}
// const FormDataShopify = async (data) => {
//     const {
//         orderNumber, allLineItems, shippingName, shippingProvince, shippingPhone, shippingStreet, shippingZip,
//         paidAt, lineItemPrice, financialStatus
//     } = data
// }
/*
{
  "_id": {
    "$oid": "69c1d68c935027e4594c6708"
  },
  "ecommerce": "Shopify",
  "store": "hermes-music-english",
  "name": "Joseph Fragoso",
  "email": "josephfguillen@gmail.com",
  "paidAt": "2026-03-23T20:10:47-04:00",
  "currency": "MXN",
  "source": "shopify_draft_order",
  "subtotal": "1228.50",
  "shipping": "0.00",
  "discountCode": "",
  "taxes": "196.56",
  "total": "1425.06",
  "shippingMethod": "N/A",
  "paymentMethod": "manual",
  "paymentReference": "N/A",
  "paymentId": "N/A",
  "vendor": "LATIN PERCUSSION",
  "lineitemSku": "H20-44367",
  "lineitemName": "Accesorios para cencerro LP308",
  "lineitemQuantity": 3,
  "lineItemPrice": "409.50",
  "lineItemOriginalPrice": "409.50",
  "lineItemDiscount": "0.00",
  "lineItemEffectiveUnitPrice": "409.50",
  "lineItemDiscountAllocations": [],
  "taxName1": "VAT",
  "taxName2": "N/A",
  "shippingName": "hermes prueba addres",
  "shippingStreet": "Naranjo 76",
  "shippingCity": "Ciudad de México",
  "shippingZip": "06400",
  "shippingProvince": "Ciudad de México",
  "shippingCountry": "Mexico",
  "shippingPhone": "+525614976932",
  "billingCountry": "Mexico",
  "orderId": {
    "$numberLong": "6375977091126"
  },
  "orderNumber": 1004,
  "orderName": "#1004",
  "financialStatus": "paid",
  "fulfillmentStatus": "unfulfilled",
  "salesManager": "",
  "allLineItems": [
    {
      "sku": "H20-44367",
      "name": "Accesorios para cencerro LP308",
      "quantity": 3,
      "vendor": "LATIN PERCUSSION",
      "price": "409.50",
      "originalPrice": "409.50",
      "totalDiscount": "0.00",
      "effectiveUnitPrice": "409.50",
      "subtotal": "1228.50",
      "subtotalAfterDiscount": "1228.50",
      "discountAllocations": [],
      "properties": []
    }
  ],
  "storeId": "hermes-music-distribucion",
  "storeName": "Hermes Music Distribucion (B2B)"
}
*/
export const handler = async (event) => {
    const order = event.order;
    let resultGeneral = {}
    try {
        order.order_number = order.orderNumber
        order.line_items = order.allLineItems
        order.line_items.map((item, index) => {
            order.line_items[index].pre_tax_price = item.price
            order.line_items[index].warehouse = {
                'idLocation': 69814321370, 'nameLocation': '830 N. Cage Blvd.', 'Plant': 'WEB', 'WarehouseCode': 'WEB'
            }
            order.line_items[index].title = item.name
        })
        order.shipping_address = {
            name: order.shippingName,
            province: order.shippingProvince,
            phone: order.shippingPhone,
            address1: order.shippingStreet,
            zip: order.shippingZip,
        }
        order.billing_address = {
            name: order.shippingName,
            province: order.shippingProvince,
            phone: order.shippingPhone,
            address1: order.shippingStreet,
            zip: order.shippingZip,
        }
        order.customer = {
            name: order.shippingName,
            province: order.shippingProvince,
            phone: order.shippingPhone,
            address1: order.shippingStreet,
            zip: order.shippingZip,
            first_name: '',
            last_name: '',
        }

        await OrderModel.create({
            orderID: order.order_number,
            status: "Processing",
            OrderNum: null,
        })
        order.created_at = order.paidAt
        order.total_price = order.lineItemPrice
        order.financial_status = order.financialStatus
        order.updated_at = order.paidAt
        order.note = ''
        order.discount_applications = []
        const result = await createHeader(order);
        resultGeneral = result
        return {
            statusCode: 200,
            body: JSON.stringify(result)
        }
        // resultGeneral = {ov_epicor: 11115, internal_state: true}
        // return {
        //     statusCode: 200,
        //     body: JSON.stringify({ov_epicor: 11115, internal_state: true})
        // }

    } catch (error) {
        console.error("Unhandled error in Lambda:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ ov_epicor: null, internal_state: false })
        }
    } finally {
        const { ov_epicor, internal_state } = resultGeneral
        await OrderModel.create({
            orderID: order.order_number,
            status: (ov_epicor != null && internal_state) ? "Complete" : "Parcial Complete",
            OrderNum: ov_epicor,
        })
    }
}
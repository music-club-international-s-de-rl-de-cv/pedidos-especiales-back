import sanitizatier, { removeDuplicate } from '@music-club-international-s-de-rl-de-cv/epicor-structure-api'
import fetch from 'node-fetch';
import ErrorModel from './models/Error.mjs';
import OrderModel from './models/OrderStatus.mjs'
import mongoose from 'mongoose';

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

const createHeader = async (orderCoppel) => {
    try {
        const { body, OrderComment, CUST_NUM, MAIL_LIST, _sData } = await sanitizatier.createHeaderBody(orderCoppel, 'coppel', process.env.DEVELOP_ENV)
        const { orderID, items } = _sData
        let _aunt = ''
        const exitsOrder = await fecthSqlOrderData(orderID)
        let newOrderPass = true
        if (process.env.DEVELOP_ENV === 'PROD') {
            if (exitsOrder[0]?.orderNum == undefined) { newOrderPass = false }
        }

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
                    marketplace: "coppel"
                });
                return { ov_epicor: null, internal_state: false };
            }

            const orderNum = response.OrderNum;

            console.log(`[ OrderNum ] >> ${orderNum} <<`);

            let bodyDetail = await sanitizatier.createDetailBody(response.OrderNum, items, 'coppel', process.env.DEVELOP_ENV, CUST_NUM, OrderComment, process.env.AUTH_GET_DESC_SP, process.env.API_KEY_PROD_EPICOR, process.env.URI_PROD_EPICOR)
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
                marketplace: "coppel"
            });
            return false;
        }

        console.log('detalle ', line, '[ OK ✅ ]');

        const realizeBody = await sanitizatier.createRealizeBody(OrderNum, 'coppel', line, quantity)
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
                marketplace: "coppel"
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


export const handler = async (event) => {
    const order = event.order;
    let resultGeneral = {}
    try {
        await OrderModel.create({
            orderID: order.order_number,
            status: "Processing",
            OrderNum: null,
        }) 
       console.log('headers==',headers)
       console.log('URL_EPICOR==',URL_EPICOR)
       console.log('CUSTOM_NUM==',CUSTOM_NUM)
        // const result = await createHeader(order);
        // resultGeneral=result
        // return {
        //     statusCode: 200,
        //     body: JSON.stringify(result)
        // }
        resultGeneral = {ov_epicor: 11115, internal_state: true}
        return {
            statusCode: 200,
            body: JSON.stringify({ov_epicor: 11115, internal_state: true})
        }

    } catch (error) {
        console.error("Unhandled error in Lambda:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ ov_epicor: null, internal_state: false })
        }
    } finally {
        const {ov_epicor, internal_state} = resultGeneral
         await OrderModel.create({
                orderID:order.order_number,
                status: (ov_epicor != null && internal_state ) ? "Complete":"Parcial Complete",
                OrderNum:ov_epicor,
            })
    }
}
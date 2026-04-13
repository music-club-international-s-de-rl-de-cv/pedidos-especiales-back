// import sanitizatier, { removeDuplicate, locationMarketplace } from '@music-club-international-s-de-rl-de-cv/epicor-structure-api'
import fetch from 'node-fetch';
import ErrorModel from './models/Error.mjs';
import OrderModel from './models/OrderStatus.mjs'
import mongoose from 'mongoose';

let headers = {
    'x-api-key': process.env.API_KEY_DEV_EPICOR,
    Authorization: `Basic ${process.env.AUTH_GET_DESC_SP}`,
    'Content-Type': 'application/json'
}
let URL_EPICOR = process.env.URI_DEV_EPICOR
let CUSTOM_NUM = 3903

if (process.env.ENVIRONMENT === 'production') {
    headers = {
        'x-api-key': process.env.API_KEY_PROD_EPICOR,
        Authorization: `Basic ${process.env.AUTH_GET_DESC_SP}`,
        'Content-Type': 'application/json'
    }
    URL_EPICOR = process.env.URI_PROD_EPICOR
    CUSTOM_NUM = 5314
}

const connectToMongo = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log("[ ✅ Conectado a MongoDB ]");
    } catch (error) {
        console.error(">> ⛔ Error al conectar con MongoDB <<", error);
        throw error;
    }
};
const createBodyHeaderOrderComment = async (item) => {
    const { shippingName, shippingZip, shippingStreet, shippingPhone, email, shippingProvince } = item
    let OrderComment = `Enviar a: Name: ${shippingName || 'NO EXISTE'}, City: ${shippingProvince || 'NO EXISTE'}, Mail: ${email || 'NO EXISTE'}, Phone: ${shippingPhone || 'NO EXISTE'}, Address: ${shippingStreet || 'NO EXISTE'}, ZipCode: ${shippingZip || 'NO EXISTE'}`

    return OrderComment
}
const standardizeData = async (data, WORK_ENV) => {
    let standarData = {}, CUST_NUM = 3903, MAIL_LIST = ['', '']
    if (WORK_ENV === 'PROD') {
        CUST_NUM = 3903
        MAIL_LIST = ['', '']
    }
    const {
        orderNumber: orderID, allLineItems: items, paidAt: PurchaseDate, total: totalPrice, financialStatus: OrderStatus,
        shippingName: fullname, shippingPhone: phone, email, discountAllocations
    } = data
    standarData = {
        orderID, fullname,
        email: (email != null && email !== '') ? email : '',
        phone: (phone != null && phone !== '') ? phone : '',
        items, PurchaseDate, totalPrice, OrderStatus, discounts: discountAllocations
    }
    return { standarData, CUST_NUM, MAIL_LIST }
}
const createHeaderBody = async (data, WORK_ENV) => {
    let OrderComment = await createBodyHeaderOrderComment(data);
    const { standarData: _sData, CUST_NUM, MAIL_LIST } = await standardizeData(data, WORK_ENV);
    let body = {}, _data = _sData
    let baseHeader = {
        ShipViaCode: 'TERR',
        OpenOrder: true,
        Company: 'HMMX',
        CustNum: CUST_NUM,
        PONum: `${_data.orderID}`,
        TermsCode: 'cod',
        OrderComment: `${OrderComment}`,
        CurrencyCode: 'MXN',
    }


    let bodyloyalty = {}, discountCode = [], discountValue = 0;
    let prodHeader = {
        ReservePriorityCode: '01',
        FormaPago_c: 'PPD (PAGO EN PARCAILIDAD)',
        MetPago_c: 'POR DEFINIR',
        UsoCfdi_c: 'G01 Adquisición de mercancia',
        Plant: 'WEB',
    }
    if (WORK_ENV === 'PROD') {
        if (_data.discounts.length > 0) {

            let infoDiscounts = _.filter(_data.discounts, (obj) => {
                if (_.includes(obj.code, '_reward')) {
                    return obj;
                }
            });

            if (infoDiscounts.length > 0) {
                for await (let lineDiscount of infoDiscounts) {
                    discountCode.push(lineDiscount.code)
                    discountValue += parseFloat(lineDiscount.value)
                }
            }
        }

        bodyloyalty = Object.assign(bodyloyalty, {
            CuponShopify_c: discountCode.length > 0 ? discountCode.join('||') : '',
            ImporteCupon_c: discountValue,
            PagoPuntos_c: discountValue,
            PagoOtro_c: 0
        });

        Object.assign(prodHeader, {
            PagoMkt_c: data.AuthTransaction.toString(),
            nombremkp_c: `${_data.fullname || 'no existe el dato en la orden'}`,
            telefonomkp_c: _data.phone.toString(),
            mailmkp_c: _data.email.toString(),
            OVMKP_c: _data.orderID.toString(),
            ...bodyloyalty
        })
    }
    Object.assign(body, { ...baseHeader }, { ...prodHeader })
    return { body, OrderComment, CUST_NUM, MAIL_LIST, _sData };
}
const createDetailBody = async (OV, items, CUST_NUM, OrderComment, AUTH, xApiKey, url, warehouse) => {
    let bodyF = [], lineNum = 0, body = {
        OpenLine: true,
        Company: "HMMX",
        OrderNum: parseInt(OV),
        CustNum: CUST_NUM
    };
    for (const [index, item] of items.entries()) {
        lineNum = index + 1;
        let objItem, bodyByMKP
        const { sku, name, quantity,  price } = item
        objItem = { sku, price, name, quantity }

        let itemEpicor = await getDescriptions(objItem.sku, 'shopify', AUTH, xApiKey, url)
        let _quantity =parseInt(quantity)
        let _price =parseInt(price)
        let PartNum = itemEpicor?.err == undefined ? itemEpicor.PriceLstParts_PartNum : objItem.sku
        let PartDescription = itemEpicor?.err == undefined ? itemEpicor.Part_PartDescription : objItem.name
        bodyByMKP = {
            OrderLine: lineNum,
            PartNum: PartNum,
            LineDesc: PartDescription,
            UnitPrice: (_price / _quantity),
            DocUnitPrice:( _price / _quantity),
            OrderComment: OrderComment,
            SellingQuantity: _quantity,
        }
        bodyF.push({ body: { ...body, ...bodyByMKP }, warehouse: warehouse })
    }
    return bodyF
}
const getDescriptions = async (sku, marketplaceID, AUTH, xApiKey, URLEpcior) => {
    let baq = ''
    try {
        switch (true) {
            case marketplaceID == 'meli' || marketplaceID == 'meli-centro' || marketplaceID == 'meli-top':
                baq = 'ListaMl2021'
                break;
            case marketplaceID == 'amazon' || marketplaceID == 'liverpool':
                baq = 'ListaAmazon'
                break;
            case marketplaceID == 'elektra' || marketplaceID == 'walmart' || marketplaceID == 'claroshop' || marketplaceID == 'coppel' || marketplaceID == 'shopify':
                baq = 'ListShopify'
                break;
        }

        let headers = {
            'x-api-key': xApiKey,
            'Authorization': AUTH,
            'Content-Type': 'application/json'
        }

        let filter = '';
        if (sku.includes('H20-') || sku.includes('R20-') || sku.includes('H21-')) {
            filter = `?$filter=Part_SKU_c eq '${sku}'`
        }
        else {
            filter = `?$filter=PriceLstParts_PartNum eq '${sku}'`
        }
        const request = await fetch(`${URLEpcior}/api/v2/odata/HMMX/BaqSvc/${baq}/Data${filter}`, {
            headers
        });

        const response = await request.json();
        let [itemDetail] = response.value;

        if (itemDetail && itemDetail.hasOwnProperty("Part_PartDescription")) {
            return itemDetail
        } else {
            console.log(` ⛔ [***ERROR AL OBTENER DESCRIPCION***] :  ${marketplaceID}, SKU:${sku}`)
            return {
                err: {
                    _errorLevel: 'getDescriptions',
                    _msgAsync: `ERROR AL OBTENER DESCRIPCION, SKU:${sku}`
                }
            }
        }
    } catch (error) {
        console.log(` ⛔ ${marketplaceID}, BAQ:${baq}, SKU:${sku} [***ERROR AL OBTENER DESCRIPCION***] = `, error)
        return {
            err: {
                errData: { ...error },
                message: 'default',
                _errorLevel: 'getDescriptions',
                _msgAsync: `ERROR AL OBTENER DESCRIPCION, BAQ:${baq}, SKU:${sku}`
            }
        }
    }
}

const createRealizeBody = async (OV, line, quantity, custnum, warehouse, plant) => {
    let body = {
        Company: "HMMX",
        OrderNum: parseInt(OV),
        OrderLine: line,
        OurReqQty: parseInt(quantity),
        OrderRelNum: 1,
        ShipViaCode: 'TERR',
        OpenRelease: true
    };

    let bodyByMKP = {
        ShipToCustNum: `${custnum}`,
        Plant: plant,
        WarehouseCode: warehouse
    }
    Object.assign(body, bodyByMKP)
    return body
}

const createHeader = async (orderShopify) => {
    try {
        const { body, OrderComment, CUST_NUM, MAIL_LIST, _sData } = await createHeaderBody(orderShopify, process.env.DEVELOP_ENV)
        const { orderID, items } = _sData
        let newOrderPass = true
        if (newOrderPass) {
            console.log('[ ⛔  NO EXITE ID DE PEDIDO EN EPICOR ⛔ ]')

            const request = await fetch(`${URL_EPICOR}/api/v2/odata/HMMX/Erp.BO.SalesOrderSvc/SalesOrders`, {
                method: 'POST',
                headers,
                body: await JSON.stringify(body)
            });
            const response = await request.json();
            if (response.error || response.ErrorMessage) {
                await ErrorModel.create({
                    order_id: orderID,
                    error_epicor: "ERROR EN EL ENCABEZADO DEL RESPONSE",
                    error_detail: response.error || response.ErrorMessage,
                    marketplace: "shopify"
                });
                return { ov_epicor: null, internal_state: false };
            }

            const orderNum = response.OrderNum;
            console.log(`✅ >>> OrderNum [${orderNum}]<<<`)

            let bodyDetail = await createDetailBody(orderNum, items, CUST_NUM, OrderComment, process.env.AUTH_GET_DESC_SP, process.env.API_KEY_PROD_EPICOR, process.env.URI_PROD_EPICOR,'WEB')
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
        const { body:{OrderNum, OrderLine, SellingQuantity: quantity} } = bodyDetail
        let body = {};
        body = JSON.stringify(bodyDetail.body);

        const request = await fetch(`${URL_EPICOR}/api/v2/odata/HMMX/Erp.BO.SalesOrderSvc/OrderDtls`, {
            method: 'post',
            headers,
            body
        });

        const response = await request.json();
        if (response.error || response.ErrorMessage) {
            await ErrorModel.create({
                order_id: orderID,
                error_epicor: "ERROR EN EL DETALLE DEL RESPONSE",
                error_detail: response?.error || response?.message || response?.ErrorMessage,
                marketplace: "shopify"
            });
            return false;
        }

        console.log('detalle ', OrderLine, '[ OK ✅ ]');

        const realizeBody = await createRealizeBody(OrderNum, OrderLine, quantity, CUSTOM_NUM, "WEB", "WEB")
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

        if (response.error || response.ErrorMessage) {
            await ErrorModel.create({
                order_id: orderID,
                error_epicor: "ERROR EN EL REALIZE DEL RESPONSE",
                error_detail: response?.error || response?.message || response?.ErrorMessage,
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

export const handler = async (event) => {
    await connectToMongo();
    const order = event.order;
    let resultGeneral = {}

    try {
        await OrderModel.create({
            orderID: order.orderNumber,
            status: "Processing",
            OrderNum: null,
        })
        const result = await createHeader(order);
        resultGeneral = result
        return {
            statusCode: 200,
            body: JSON.stringify(result)
        }


    } catch (error) {
        console.error("Unhandled error in Lambda:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ ov_epicor: null, internal_state: false })
        }
    } finally {
        const { ov_epicor , internal_state  } = resultGeneral
        console.log("FINALLY - orderNumber:", order.orderNumber, typeof order.orderNumber)

        const updateResult = await OrderModel.updateOne(
            { orderID: order.orderNumber.toString() }, // ← fuerza string
            {
                $set: {
                    status: (ov_epicor != null && internal_state) ? "Complete" : "Parcial Complete",
                    OrderNum: ov_epicor,
                }
            }
        )
        console.log("FINALLY - updateResult:", updateResult) // ← dice cuántos docs modificó
    }
}   
// const OrderSchema = new mongoose.Schema({
//   orderID: { type: String, required: false },
//   status: { type: String, required: false },
//   OrderNum: { type: Number, required: false }, 
// //   ShopifyOrder: { type: String, required: true }
// }, { timestamps: true });



// // Evita volver a compilar el modelo si ya existe
// const OrderModel = mongoose.models.Error || mongoose.model('orders', OrderSchema);

// export default OrderModel;

import mongoose from 'mongoose';

const LineItemSchema = new mongoose.Schema({
  sku:                    { type: String,  default: null },
  name:                   { type: String,  default: null },
  quantity:               { type: Number,  default: null },
  vendor:                 { type: String,  default: null },
  productId:              { type: Number,  default: null },
  variantId:              { type: Number,  default: null },
  price:                  { type: String,  default: null },
  originalPrice:          { type: String,  default: null },
  basePrice:              { type: String,  default: null },
  totalDiscount:          { type: String,  default: null },
  effectiveUnitPrice:     { type: String,  default: null },
  subtotal:               { type: String,  default: null },
  subtotalAfterDiscount:  { type: String,  default: null },
  basePriceDiscount:      { type: String,  default: null },
  basePriceDiscountPercent: { type: Number, default: null },
  partnum:                { type: String,  default: null },
  quantityRule:           { type: String,  default: null },
  volumePricing:          { type: [mongoose.Schema.Types.Mixed], default: [] },
  discountAllocations:    { type: [mongoose.Schema.Types.Mixed], default: [] },
  properties:             { type: [mongoose.Schema.Types.Mixed], default: [] },
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  ecommerce:              { type: String,  default: null },
  store:                  { type: String,  default: null },
  customerId:             { type: Number,  default: null },
  name:                   { type: String,  default: null },
  email:                  { type: String,  default: null },
  paidAt:                 { type: String,  default: null },
  currency:               { type: String,  default: null },
  source:                 { type: String,  default: null },
  subtotal:               { type: String,  default: null },
  shipping:               { type: String,  default: null },
  discountCode:           { type: String,  default: null },
  taxes:                  { type: String,  default: null },
  total:                  { type: String,  default: null },
  shippingMethod:         { type: String,  default: null },
  paymentMethod:          { type: String,  default: null },
  paymentReference:       { type: String,  default: null },
  paymentId:              { type: String,  default: null },
  vendor:                 { type: String,  default: null },
  lineitemSku:            { type: String,  default: null },
  lineitemName:           { type: String,  default: null },
  lineitemQuantity:       { type: Number,  default: null },
  lineItemPrice:          { type: String,  default: null },
  lineItemOriginalPrice:  { type: String,  default: null },
  lineItemErpBasePrice:   { type: String,  default: null },
  lineItemPartnum:        { type: String,  default: null },
  lineItemDiscount:       { type: String,  default: null },
  lineItemEffectiveUnitPrice: { type: String, default: null },
  lineItemDiscountAllocations: { type: [mongoose.Schema.Types.Mixed], default: [] },
  taxName1:               { type: String,  default: null },
  taxName2:               { type: String,  default: null },
  shippingName:           { type: String,  default: null },
  shippingStreet:         { type: String,  default: null },
  shippingCity:           { type: String,  default: null },
  shippingZip:            { type: String,  default: null },
  shippingProvince:       { type: String,  default: null },
  shippingCountry:        { type: String,  default: null },
  shippingPhone:          { type: String,  default: null },
  billingCountry:         { type: String,  default: null },
  orderId:                { type: Number,  default: null },
  orderNumber:            { type: Number,  default: null },
  orderName:              { type: String,  default: null },
  financialStatus:        { type: String,  default: null },
  fulfillmentStatus:      { type: String,  default: null },
  salesChannel:           { type: String,  default: null },
  riskLevel:              { type: String,  default: null },
  riskRecommendation:     { type: String,  default: null },
  riskAssessments:        { type: [mongoose.Schema.Types.Mixed], default: [] },
  deliveryMethodType:     { type: String,  default: null },
  isPickup:               { type: Boolean, default: null },
  salesManager:           { type: String,  default: null },
  allLineItems:           { type: [LineItemSchema], default: [] },
  storeId:                { type: String,  default: null },
  storeName:              { type: String,  default: null },
  status: { type: String, required: false },
  OrderNum: { type: Number, required: false }, 
  error_epicor: { type: String, required: false },
  error_detail: { type: String, required: false },
  marketplace: { type: String, required: false }
}, { timestamps: true });

const OrderModel = mongoose.models.orders || mongoose.model('orders', OrderSchema);

export default OrderModel;
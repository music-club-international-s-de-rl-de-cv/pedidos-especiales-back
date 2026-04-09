import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  orderID: { type: String, required: true },
  status: { type: String, required: true },
  OrderNum: { type: Number, required: true }, 
//   ShopifyOrder: { type: String, required: true }
}, { timestamps: true });

// Evita volver a compilar el modelo si ya existe
const OrderModel = mongoose.models.Error || mongoose.model('EpicorOrder', OrderSchema);

export default OrderModel;

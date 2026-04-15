import mongoose from 'mongoose';

const ErrorSchema = new mongoose.Schema({
  order_id: { type: String, required: false },
  error_epicor: { type: String, required: false },
  error_detail: { type: String, required: false },
  marketplace: { type: String, required: false }
}, { timestamps: true });

// Evita volver a compilar el modelo si ya existe
const ErrorModel = mongoose.models.Error || mongoose.model('orders', ErrorSchema);

export default ErrorModel;

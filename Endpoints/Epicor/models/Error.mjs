import mongoose from 'mongoose';

const ErrorSchema = new mongoose.Schema({
  order_id: { type: String, required: true },
  error_epicor: { type: String, required: true },
  error_detail: { type: String, required: true },
  marketplace: { type: String, required: true }
}, { timestamps: true });

// Evita volver a compilar el modelo si ya existe
const ErrorModel = mongoose.models.Error || mongoose.model('ErrorOrder', ErrorSchema);

export default ErrorModel;

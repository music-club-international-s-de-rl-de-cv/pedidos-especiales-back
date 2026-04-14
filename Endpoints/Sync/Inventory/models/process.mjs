import mongoose from 'mongoose';

const ProcessSchema = new mongoose.Schema({
  sku:                { type: String,  required: true },
  // campos de inventoryProcess
  oldQuantity:        { type: Number,  default: null },
  newQuantity:        { type: Number,  default: null },
  // campos de pricesProcess
  oldPrices:          { type: Number,  default: null },
  oldPriceCompareAt:  { type: Number,  default: null },
  newPrices:          { type: Number,  default: null },
  newPriceCompareAt:  { type: Number,  default: null },
  // campos comunes
  status:             { type: Boolean, required: true },
  message:            { type: String,  required: true },
}, { _id: false });

const InventorySchema = new mongoose.Schema({
  processId:   { type: String,          required: true },
  process:     { type: [ProcessSchema], required: true },
  createdAt:   { type: String,          required: true },
  user_system: { type: String,          required: true },
  taskName:    { type: String,          required: true },
}, { timestamps: true });

// Evita volver a compilar el modelo si ya existe
const InventoryModel = mongoose.models.Error || mongoose.model('b2b_process', InventorySchema);

export default InventoryModel; 
    // process: inventoryProcess[] | pricesProcess[],
 

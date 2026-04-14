import mongoose from 'mongoose';

const InventorySchema = new mongoose.Schema({
    id: { type: String, required: true },
    sku: { type: String, required: true },
    title: { type: String, required: true },
    status: { type: String, required: true },
    vendor: { type: String, required: true },
    productType: { type: String, required: true },
    variantId: { type: String, required: true },
    quantity: { type: Number, required: false },
    inventoryItemID: { type: String, required: true },
    idInvLev: { type: String, required: true },
    idLocation: { type: String, required: true },
    locationName: { type: String, required: true },


}, { timestamps: true });

// Evita volver a compilar el modelo si ya existe
const InventoryModel = mongoose.models.Error || mongoose.model('b2b_products', InventorySchema);

export default InventoryModel;

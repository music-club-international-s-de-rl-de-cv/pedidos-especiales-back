import mongoose from 'mongoose';

const InventorySchema = new mongoose.Schema({
    id: { type: String, required: true },
    sku: { type: String, default: null },
    title: { type: String, required: true },
    status: { type: String, required: false },
    vendor: { type: String, required: false },
    productType: { type: String, required: false },
    variantId: { type: String, required: false },
    quantity: { type: Number, required: false },
    inventoryItemID: { type: String, required: false },
    idInvLev: { type: String, required: false },
    idLocation: { type: String, required: false },
    locationName: { type: String, required: false },


}, { timestamps: true });

// Evita volver a compilar el modelo si ya existe 
const InventoryModel = mongoose.models.b2b_products || mongoose.model('b2b_products', InventorySchema)

// export default InventoryModel;
export { InventoryModel }
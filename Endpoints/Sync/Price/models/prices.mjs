import mongoose from 'mongoose';

const PricesSchema = new mongoose.Schema({ 
    id: { type: String, required: true },
    sku: { type: String, required: true },
    title: { type: String, required: true },
    status: { type: String, required: true },
    vendor: { type: String, required: true },
    productType: { type: String, required: true },
    variantId: { type: String, required: true },
    inventoryItemID: { type: String, required: true },
    price: { type: String, required: true },
    compareAtPrice: { type: String, default: null }
}, { timestamps: true });


const PricesModel = mongoose.models.Error || mongoose.model('b2b_prices', PricesSchema);

export default PricesModel;

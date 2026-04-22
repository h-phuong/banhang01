const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI);

async function migrateProductThumbnails() {
    try {
        const products = await Product.find({ thumbnail: { $regex: '^/uploads/' } });

        for (const product of products) {
            const filename = product.thumbnail.replace('/uploads/', '').split('.')[0];
            const image = await mongoose.model('Image').findOne({ filename });

            if (image) {
                product.thumbnail = image.imagePath;
                await product.save();
                console.log(`Updated product ${product._id} thumbnail to ${image.imagePath}`);
            } else {
                console.log(`No image found for ${filename}`);
            }
        }

        console.log('Migration completed');
    } catch (err) {
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
}

migrateProductThumbnails();
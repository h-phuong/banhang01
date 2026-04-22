const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function syncImages() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const Image = require('./models/Image');
        console.log('Connected to DB');
        
        let hasMore = true;
        let nextCursor = null;
        let totalCount = 0;

        while (hasMore) {
            const options = { type: 'upload', prefix: 'webthoitrang/', max_results: 500 };
            if (nextCursor) options.next_cursor = nextCursor;
            
            const result = await cloudinary.api.resources(options);
            console.log(`Found ${result.resources.length} images in this batch`);
            totalCount += result.resources.length;
            
            for (const res of result.resources) {
                await Image.updateOne(
                    { filename: res.public_id },
                    {
                        $set: {
                            filename: res.public_id,
                            imagePath: res.secure_url,
                            fileSize: res.bytes || 0,
                            originalName: res.public_id.split('/').pop(),
                            isActive: true
                        }
                    },
                    { upsert: true }
                );
            }
            
            if (result.next_cursor) {
                nextCursor = result.next_cursor;
            } else {
                hasMore = false;
            }
        }
        
        console.log(`Done syncing ${totalCount} images to DB`);
    } catch(err) {
        console.error('Error syncing images:', err);
    } finally {
        await mongoose.disconnect();
    }
}

syncImages();
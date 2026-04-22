const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const Image = require('./models/Image');

// Cấu hình Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Kết nối DB
mongoose.connect(process.env.MONGO_URI);

const uploadsDir = path.join(__dirname, 'uploads');

async function migrateImages() {
    try {
        const files = fs.readdirSync(uploadsDir);
        console.log(`Found ${files.length} files to migrate`);

        for (const file of files) {
            const filePath = path.join(uploadsDir, file);
            if (!fs.statSync(filePath).isFile()) continue;

            console.log(`Migrating ${file}...`);

            // Upload to Cloudinary
            const result = await cloudinary.uploader.upload(filePath, {
                folder: 'webthoitrang',
                public_id: file.split('.')[0],
                resource_type: 'image',
            });

            // Update DB
            await Image.updateOne(
                { filename: file },
                {
                    filename: result.public_id,
                    imagePath: result.secure_url,
                    fileSize: result.bytes,
                }
            );

            // Delete local file
            fs.unlinkSync(filePath);
            console.log(`Migrated ${file}`);
        }

        console.log('Migration completed!');
    } catch (error) {
        console.error('Migration error:', error);
    } finally {
        mongoose.disconnect();
    }
}

migrateImages();
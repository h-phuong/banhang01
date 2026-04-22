const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        console.log('📌 MONGO_URI:', process.env.MONGO_URI);
        
        const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/WebThoiTrang';
        await mongoose.connect(uri);
        console.log('✅ Connected to MongoDB Successfully!');
    } catch (error) {
        console.error('Connection Failed:', error.message);
        console.log('⚠️ Will continue anyway for testing...');
    }
};

module.exports = connectDB;
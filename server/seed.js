const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs'); 
const { faker } = require('@faker-js/faker/locale/vi');

// Import Models
const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');
const Order = require('./models/Order');
const { Color, Size } = require('./models/MasterData');

dotenv.config();

// Cấu hình mật khẩu mặc định
const DEFAULT_PASSWORD = 'Abc@1234';

const random = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// --- HÀM CHÍNH ---
const runSeed = async () => {
    try {
        // 1. KẾT NỐI DB
        console.log('⏳ Đang kết nối MongoDB...');
        const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/WebThoiTrang';
        await mongoose.connect(uri);
        console.log('✅ Đã kết nối MongoDB thành công!');

        // 2. XÓA DỮ LIỆU CŨ
        console.log('🧹 Đang dọn dẹp dữ liệu cũ...');
        await Promise.all([
            User.deleteMany({}),
            Category.deleteMany({}),
            Product.deleteMany({}),
            Order.deleteMany({}),
            Color.deleteMany({}),
            Size.deleteMany({})
        ]);

        // 3. MÃ HÓA MẬT KHẨU
        console.log('🔐 Đang mã hóa mật khẩu mặc định...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, salt);

        // 4. TẠO MASTER DATA
        console.log('🎨 Đang tạo Master Data...');
        const colorDocs = [
            { name: 'Đỏ', hexCode: '#FF0000' }, { name: 'Xanh Dương', hexCode: '#0000FF' },
            { name: 'Đen', hexCode: '#000000' }, { name: 'Trắng', hexCode: '#FFFFFF' },
            { name: 'Vàng', hexCode: '#FFFF00' }, { name: 'Xám', hexCode: '#808080' }
        ];
        const sizeDocs = [
            { name: 'S' }, { name: 'M' }, { name: 'L' }, { name: 'XL' }, { name: 'XXL' }
        ];
        const createdColors = await Color.insertMany(colorDocs);
        const createdSizes = await Size.insertMany(sizeDocs);

        // 5. TẠO DANH MỤC
        console.log('📂 Đang tạo Danh mục...');
        const categories = await Category.insertMany([
            { name: 'Áo Thun Nam', slug: 'ao-thun-nam' },
            { name: 'Áo Sơ Mi', slug: 'ao-so-mi' },
            { name: 'Quần Jeans', slug: 'quan-jeans' },
            { name: 'Giày Thể Thao', slug: 'giay-the-thao' },
            { name: 'Phụ Kiện', slug: 'phu-kien' }
        ]);

        // 6. TẠO SẢN PHẨM
        console.log('👕 Đang tạo 50 Sản phẩm...');
        const products = [];
        for (let i = 0; i < 50; i++) {
            const selectedCat = random(categories);
            const numVariants = randomInt(2, 5);
            
            const productVariants = [];
            for (let j = 0; j < numVariants; j++) {
                productVariants.push({
                    color: random(createdColors)._id,
                    size: random(createdSizes)._id,
                    quantity: randomInt(10, 100),
                    priceModifier: randomInt(0, 5) * 10000
                });
            }

            products.push({
                name: faker.commerce.productName(),
                description: faker.commerce.productDescription(),
                price: parseFloat(faker.commerce.price({ min: 100000, max: 1000000, dec: 0 })),
                categoryId: selectedCat._id,
                thumbnail: faker.image.urlLoremFlickr({ category: 'fashion' }),
                variants: productVariants,
                images: [
                    { imageUrl: faker.image.urlLoremFlickr({ category: 'fashion' }) },
                    { imageUrl: faker.image.urlLoremFlickr({ category: 'clothes' }) }
                ],
                isActive: true
            });
        }
        const createdProducts = await Product.insertMany(products);

        // 7. TẠO USER (Đã sửa lỗi passwordHash tại đây)
        console.log('👤 Đang tạo 20 Người dùng...');
        const users = [];

        // Admin
        users.push({
            username: 'admin',
            passwordHash: hashedPassword, // <-- Đã sửa: dùng passwordHash thay vì password
            email: 'admin@gmail.com',
            fullName: 'Quản Trị Viên',
            phoneNumber: '0909000111',
            role: 'Admin',
            addresses: []
        });

        // Users
        for (let i = 0; i < 19; i++) {
            users.push({
                username: faker.internet.username(),
                passwordHash: hashedPassword, // <-- Đã sửa: dùng passwordHash thay vì password
                email: faker.internet.email(),
                fullName: faker.person.fullName(),
                phoneNumber: faker.phone.number(),
                role: 'Customer',
                addresses: [{
                    contactName: faker.person.fullName(),
                    contactPhone: faker.phone.number(),
                    addressLine: faker.location.streetAddress(),
                    ward: 'Phường ' + randomInt(1, 15),
                    district: 'Quận ' + randomInt(1, 12),
                    city: 'TP.HCM',
                    isDefault: true
                }]
            });
        }
        const createdUsers = await User.insertMany(users);

        // 8. TẠO ORDER
        console.log('📦 Đang tạo 30 Đơn hàng...');
        const orders = [];
        const customerUsers = createdUsers.filter(u => u.role === 'Customer');

        for (let i = 0; i < 30; i++) {
            if (customerUsers.length === 0) break;

            const randomUser = random(customerUsers);
            const userAddress = randomUser.addresses[0] || { contactName: 'N/A', contactPhone: 'N/A' };
            const numItems = randomInt(1, 3);
            const orderItems = [];
            let totalAmount = 0;

            for (let k = 0; k < numItems; k++) {
                const prod = random(createdProducts);
                const variant = random(prod.variants);
                const colorInfo = createdColors.find(c => c._id.equals(variant.color));
                const sizeInfo = createdSizes.find(s => s._id.equals(variant.size));
                const qty = randomInt(1, 3);
                const unitPrice = prod.price + (variant.priceModifier || 0);

                totalAmount += unitPrice * qty;
                orderItems.push({
                    productId: prod._id,
                    variantId: variant._id,
                    colorName: colorInfo ? colorInfo.name : 'Unknown',
                    sizeName: sizeInfo ? sizeInfo.name : 'Unknown',
                    quantity: qty,
                    unitPrice: unitPrice
                });
            }

            const shippingFee = 30000;
            orders.push({
                userId: randomUser._id,
                shippingName: userAddress.contactName,
                shippingPhone: userAddress.contactPhone,
                shippingAddress: `${userAddress.addressLine}, ${userAddress.ward}, ${userAddress.district}, ${userAddress.city}`,
                totalAmount: totalAmount,
                shippingFee: shippingFee,
                finalAmount: totalAmount + shippingFee,
                paymentMethod: random(['COD', 'VNPAY', 'MOMO']),
                status: random(['Pending', 'Confirmed', 'Shipping', 'Success', 'Cancelled']),
                details: orderItems
            });
        }
        await Order.insertMany(orders);

        console.log('----------------------------------------------------');
        console.log('🎉 TẤT CẢ HOÀN TẤT!');
        console.log(`🔑 Admin: admin@gmail.com | Pass: ${DEFAULT_PASSWORD}`);
        console.log('----------------------------------------------------');
        process.exit();

    } catch (error) {
        console.error('❌ Lỗi:', error);
        process.exit(1);
    }
};

runSeed();
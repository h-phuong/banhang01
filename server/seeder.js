const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User'); // Đảm bảo đường dẫn đúng tới model User
const connectDB = require('./config/db'); // Đảm bảo đường dẫn đúng tới file connect db

dotenv.config();
connectDB();

const importData = async () => {
  try {
    // 1. Xóa hết user cũ để làm sạch dữ liệu (tránh trùng lặp lỗi)
    await User.deleteMany();
    console.log('--- Đã xóa dữ liệu cũ ---');

    // 2. Danh sách User mẫu (Mật khẩu chưa mã hóa)
    // Model User của bạn có middleware pre('save') nên nó sẽ tự động mã hóa khi lưu.
    const users = [
      {
        username: 'admin',
        email: 'admin@gmail.com',
        password: '123456',
        fullName: 'Quản Trị Viên',
        role: 'admin',
        phoneNumber: '0909000111',
        address: 'Hà Nội'
      },
      {
        username: 'staff',
        email: 'staff@gmail.com',
        password: '123456',
        fullName: 'Nhân Viên Bán Hàng',
        role: 'staff',
        phoneNumber: '0909000222',
        address: 'Đà Nẵng'
      },
      {
        username: 'customer',
        email: 'customer@gmail.com',
        password: '123456',
        fullName: 'Khách Hàng Thân Thiết',
        role: 'customer',
        phoneNumber: '0909000333',
        address: 'TP. Hồ Chí Minh'
      }
    ];

    // 3. Lưu từng user (Để kích hoạt pre('save') trong Model)
    for (const user of users) {
        await User.create(user);
    }

    console.log('✅ ĐÃ NẠP DỮ LIỆU THÀNH CÔNG!');
    console.log('👉 Mật khẩu cho tất cả tài khoản là: 123456');
    process.exit();
  } catch (error) {
    console.error('❌ Lỗi nạp dữ liệu:', error);
    process.exit(1);
  }
};

importData();
const User = require('../models/User');
const bcrypt = require('bcryptjs'); 

// 1. Lấy danh sách (Có Phân trang + Tìm kiếm + Lọc Role)
exports.getAllUsers = async (req, res) => {
    try {
        // --- 1. Lấy tham số từ URL ---
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || ''; 
        const role = req.query.role || ''; // Lấy tham số role (Admin/Staff/Customer)
        
        const skip = (page - 1) * limit;

        // --- 2. Xây dựng bộ lọc (Query) ---
        let query = {};

        // Logic Tìm kiếm (Username hoặc Email hoặc FullName)
        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { fullName: { $regex: search, $options: 'i' } }
            ];
        }

        // Logic Lọc theo Role (Nếu có chọn role và không phải là 'All')
        if (role && role !== 'All') {
            query.role = role;
        }

        // --- 3. Thực hiện Query ---
        const totalDocs = await User.countDocuments(query); // Đếm dựa trên bộ lọc
        const totalPages = Math.ceil(totalDocs / limit);

        const users = await User.find(query)
            .select('-passwordHash')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        // --- 4. Trả về kết quả ---
        res.status(200).json({
            docs: users,
            totalDocs,
            totalPages,
            page,
            limit
        });

    } catch (error) {
        console.error("Lỗi get all users:", error);
        res.status(500).json({ message: 'Lỗi server khi tải danh sách người dùng' });
    }
};

// 2. Lấy chi tiết 1 người dùng theo ID
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-passwordHash');
        if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 3. Tạo người dùng mới
exports.createUser = async (req, res) => {
    try {
        const { username, email, password, ...userData } = req.body;

        // --- Kiểm tra trùng lặp trước khi tạo ---
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'Username hoặc Email đã tồn tại!' });
        }

        const newUser = new User({
            username,
            email,
            ...userData,
            passwordHash: password // Gán vào passwordHash để model tự hash
        });

        const savedUser = await newUser.save();
        
        // Trả về user nhưng bỏ passwordHash đi cho bảo mật
        const userResponse = savedUser.toObject();
        delete userResponse.passwordHash;

        res.status(201).json(userResponse);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// 4. Cập nhật người dùng
exports.updateUser = async (req, res) => {
    try {
        const { password, ...updateData } = req.body;
        
        const user = await User.findById(req.params.id);
        if(!user) return res.status(404).json({ message: 'User not found' });

        // Cập nhật thông tin (trừ password)
        Object.assign(user, updateData);

        // Xử lý password riêng (chỉ update nếu có gửi lên)
        if (password && password.trim() !== '') {
            user.passwordHash = password; 
            // Model sẽ tự nhận diện field này thay đổi và hash lại
        }

        const updatedUser = await user.save();
        
        // Trả về kết quả sạch (không pass)
        const userResponse = updatedUser.toObject();
        delete userResponse.passwordHash;

        res.status(200).json(userResponse);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 5. Khóa/Mở khóa tài khoản (Logic Soft Delete chạy trên Server)
exports.deleteUser = async (req, res) => {
    try {
        // Tìm user theo ID
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: "Người dùng không tồn tại" });
        }

        // Đảo ngược trạng thái khóa (True <-> False)
        user.isLocked = !user.isLocked; 

        await user.save();

        // Gửi phản hồi về cho Frontend biết đã làm xong
        const message = user.isLocked 
            ? 'Đã khóa tài khoản thành công' 
            : 'Đã mở khóa tài khoản thành công';

        res.status(200).json({ 
            message: message,
            data: { _id: user._id, isLocked: user.isLocked }
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
import express from 'express';
import Student from '../models/Student.js';

const router = express.Router();

// Hiển thị danh sách sinh viên
router.get('/', async (req, res) => {
    try {
        const students = await Student.find({}).lean();
        // console.log("Dữ liệu sinh viên lấy từ DB:", students); // Debug dữ liệu
        res.render('ex1', { students });
    } catch (err) {
        console.error("Lỗi khi lấy danh sách sinh viên:", err);
        res.status(500).send('Lỗi tải dữ liệu');
    }
});

// Lấy danh sách sinh viên
router.get('/students', async (req, res) => {
    try {
        const students = await Student.find({});
        res.json(students);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Thêm sinh viên
router.post('/students', async (req, res) => {
    try {
        const student = new Student(req.body);
        await student.save();
        res.status(201).json({ message: 'Sinh viên đã được thêm!', student });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Cập nhật sinh viên
router.put('/students/:id', async (req, res) => {
    try {
        const studentId = req.params.id;

        // Kiểm tra xem sinh viên có tồn tại không
        const existingStudent = await Student.findById(studentId);
        if (!existingStudent) {
            return res.status(404).json({ error: 'Không tìm thấy sinh viên!' });
        }

        // Cập nhật thông tin sinh viên
        const updatedStudent = await Student.findByIdAndUpdate(studentId, req.body, {
            new: true,
            runValidators: true
        });

        if (!updatedStudent) {
            return res.status(500).json({ error: 'Cập nhật thất bại, vui lòng thử lại!' });
        }

        res.json({ message: 'Cập nhật thành công!', student: updatedStudent });

    } catch (err) {
        console.error("Lỗi khi cập nhật sinh viên:", err);
        res.status(500).json({ error: 'Lỗi khi cập nhật sinh viên!' });
    }
});


// Xóa sinh viên
router.delete('/students/:id', async (req, res) => {
    try {
        await Student.findByIdAndDelete(req.params.id);
        res.json({ message: 'Sinh viên đã bị xóa!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;

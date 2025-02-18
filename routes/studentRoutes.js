import express from 'express';
import Student from '../models/Student.js';
import Config from '../models/Config.js';
//export data
import { Parser } from 'json2csv';
import ExcelJS from 'exceljs';
//import data
import multer from 'multer';
import csvParser from 'csv-parser';

import fs from 'fs';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Import JSON
router.post('/import/json', upload.single('file'), async (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(req.file.path, 'utf-8'));
        await Student.insertMany(data);
        res.json({ message: "Import JSON thành công!" });
    } catch (err) {
        res.status(500).json({ error: "Lỗi khi import JSON!" });
    }
});

// Import Excel
router.post('/import/excel', upload.single('file'), async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);
        const worksheet = workbook.worksheets[0]; // Lấy sheet đầu tiên
        const students = [];

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Bỏ qua dòng tiêu đề
            students.push({
                studentId: row.getCell(1).value,
                name: row.getCell(2).value,
                birthdate: row.getCell(3).value,
                gender: row.getCell(4).value,
                department: row.getCell(5).value,
                status: row.getCell(6).value,
                email: row.getCell(7).value,
                phone: row.getCell(8).value,
                course: row.getCell(9).value,
                program: row.getCell(10).value,
                address: row.getCell(11).value
            });
        });

        await Student.insertMany(students);
        res.json({ message: "Import Excel thành công!" });
    } catch (err) {
        res.status(500).json({ error: "Lỗi khi import Excel!" });
    }
});

// Xuất dữ liệu dạng JSON
router.get('/export/json', async (req, res) => {
    try {
        const students = await Student.find({});
        res.setHeader('Content-Disposition', 'attachment; filename=students.json');
        res.setHeader('Content-Type', 'application/json');
        res.json(students);
    } catch (err) {
        res.status(500).json({ error: "Lỗi khi xuất JSON!" });
    }
});

// Xuất dữ liệu dạng Excel
router.get('/export/excel', async (req, res) => {
    try {
        const students = await Student.find({});
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Students");

        // Thêm tiêu đề cột
        worksheet.columns = [
            { header: "MSSV", key: "studentId", width: 15 },
            { header: "Họ Tên", key: "name", width: 20 },
            { header: "Ngày Sinh", key: "birthdate", width: 15 },
            { header: "Giới Tính", key: "gender", width: 10 },
            { header: "Khoa", key: "department", width: 20 },
            { header: "Tình Trạng", key: "status", width: 15 },
            { header: "Email", key: "email", width: 25 },
            { header: "SĐT", key: "phone", width: 15 },
            { header: "Khóa", key: "course", width: 10 },
            { header: "Chương Trình", key: "program", width: 20 },
            { header: "Địa Chỉ", key: "address", width: 30 }
        ];

        // Thêm dữ liệu sinh viên vào bảng
        students.forEach(student => {
            worksheet.addRow(student);
        });

        // Định dạng tiêu đề cột (chữ in đậm)
        worksheet.getRow(1).eachCell(cell => {
            cell.font = { bold: true };
        });

        // Xuất file Excel
        res.setHeader('Content-Disposition', 'attachment; filename=students.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        const buffer = await workbook.xlsx.writeBuffer();
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ error: "Lỗi khi xuất Excel!" });
    }
});

// Lấy danh sách department, status, program
router.get('/config', async (req, res) => {
    try {
        let config = await Config.findOne();
        if (!config) {
            config = await Config.create({});
        }
        res.json(config);
    } catch (err) {
        res.status(500).json({ error: "Lỗi khi lấy danh sách cấu hình!" });
    }
});

// Cập nhật danh sách department, status, program
router.post('/config', async (req, res) => {
    try {
        let config = await Config.findOne();
        if (!config) {
            config = new Config({});
        }

        if (req.body.departments) {
            config.departments = req.body.departments;
        }
        if (req.body.statuses) {
            config.statuses = req.body.statuses;
        }
        if (req.body.programs) {
            config.programs = req.body.programs;
        }

        await config.save();
        res.json({ message: "Cập nhật thành công!", config });
    } catch (err) {
        res.status(500).json({ error: "Lỗi khi cập nhật danh sách cấu hình!" });
    }
});

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
        if (err.code === 11000) {
            return res.status(400).json({ error: 'Email bị trùng' });
        }
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

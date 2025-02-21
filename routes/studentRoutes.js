import express from 'express';
import Student from '../models/Student.js';
import Config from '../models/Config.js';
import path from 'path';
//export data
import ExcelJS from 'exceljs';
//import data
import multer from 'multer';
//Logger
import logger from '../utils/logger.js';

import fs from 'fs';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Import JSON + Logger + kiểm tra email
router.post('/import/json', upload.single('file'), async (req, res) => {
    try {
        logger.info(`Bắt đầu import file JSON: ${req.file.originalname}`);
        const data = JSON.parse(fs.readFileSync(req.file.path, 'utf-8'));

        // Lấy danh sách tên miền hợp lệ từ Config
        const config = await Config.findOne();
        const allowedDomains = config ? config.allowedEmailDomains : [];

        let importedCount = 0;
        let skippedCount = 0;
        let invalidEmails = [];

        for (const student of data) {
            if (!allowedDomains.some(domain => student.email.endsWith(`@${domain}`))) {
                invalidEmails.push(student.email);
                skippedCount++;
                continue; // Bỏ qua sinh viên có email không hợp lệ
            }

            const existingStudent = await Student.findOne({ studentId: student.studentId });
            if (existingStudent) {
                // Nếu MSSV đã tồn tại, cập nhật thông tin
                await Student.updateOne({ studentId: student.studentId }, student);
                // logger.info(`Cập nhật thông tin: MSSV ${student.studentId}`);
            } else {
                // Nếu MSSV chưa tồn tại, thêm mới
                await Student.create(student);
                importedCount++;
            }
        }

        logger.info(`Import JSON hoàn tất: ${importedCount} sinh viên mới, ${skippedCount} bị bỏ qua.`);

        res.json({
            message: `Import hoàn tất! ${importedCount} sinh viên mới được thêm, ${skippedCount} sinh viên bị bỏ qua.`,
            invalidEmails
        });
    } catch (err) {
        logger.error(`Lỗi khi import JSON: ${err.message}`);
        res.status(500).json({ error: "Lỗi khi import JSON!" });
    }
});

// Import Excel + Logger + kiểm tra email
router.post('/import/excel', upload.single('file'), async (req, res) => {
    try {
        logger.info(`Bắt đầu import file Excel: ${req.file.originalname}`);

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);
        const worksheet = workbook.worksheets[0];
        const config = await Config.findOne();
        const allowedDomains = config ? config.allowedEmailDomains : [];

        let importedCount = 0;
        let skippedCount = 0;
        let invalidEmails = [];

        // Lấy hàng đầu tiên làm header
        const headers = {};
        worksheet.getRow(1).eachCell((cell, colNumber) => {
            headers[cell.value] = colNumber;  // Lưu vị trí của từng cột theo tên
        });

        // Kiểm tra các header bắt buộc có tồn tại không
        const requiredHeaders = ["MSSV", "Họ Tên", "Ngày Sinh", "Giới Tính", "Khoa", "Email"];
        for (const header of requiredHeaders) {
            if (!headers[header]) {
                return res.status(400).json({ error: `Thiếu cột bắt buộc: ${header}` });
            }
        }

        // Đọc dữ liệu từ hàng 2 trở đi
        for (let i = 2; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);
            const studentData = {
                studentId: row.getCell(headers["MSSV"]).value,
                name: row.getCell(headers["Họ Tên"]).value,
                birthdate: row.getCell(headers["Ngày Sinh"])?.value || "",
                gender: row.getCell(headers["Giới Tính"])?.value || "",
                department: row.getCell(headers["Khoa"])?.value || "",
                status: row.getCell(headers["Tình Trạng"])?.value || "",
                email: row.getCell(headers["Email"]).value,
                phone: row.getCell(headers["SĐT"])?.value || "",
                course: row.getCell(headers["Khóa"])?.value || "",
                program: row.getCell(headers["Chương Trình"])?.value || "",
                address: row.getCell(headers["Địa Chỉ"])?.value || "",
            };

            if (!allowedDomains.some(domain => studentData.email.endsWith(`@${domain}`))) {
                invalidEmails.push(studentData.email);
                skippedCount++;
                continue; // Bỏ qua nếu email không hợp lệ
            }

            const existingStudent = await Student.findOne({ studentId: studentData.studentId });
            if (existingStudent) {
                await Student.updateOne({ studentId: studentData.studentId }, studentData);
            } else {
                await Student.create(studentData);
                importedCount++;
            }
        }

        logger.info(`Import Excel hoàn tất: ${importedCount} sinh viên mới, ${skippedCount} bị bỏ qua.`);
        res.json({
            message: `Import hoàn tất! ${importedCount} sinh viên mới được thêm, ${skippedCount} sinh viên bị bỏ qua.`,
            invalidEmails
        });
    } catch (err) {
        logger.error(`Lỗi khi import Excel: ${err.message}`);
        res.status(500).json({ error: "Lỗi khi import Excel!" });
    }
});

// Xuất dữ liệu dạng JSON + Logger
router.get('/export/json', async (req, res) => {
    try {
        const students = await Student.find({});
        logger.info(`Xuất JSON - Tổng số sinh viên: ${students.length}`);
        res.setHeader('Content-Disposition', 'attachment; filename=students.json');
        res.setHeader('Content-Type', 'application/json');
        res.json(students);
    } catch (err) {
        logger.error(`Lỗi khi xuất JSON: ${err.message}`);
        res.status(500).json({ error: "Lỗi khi xuất JSON!" });
    }
});

// Xuất dữ liệu dạng Excel + Logger
router.get('/export/excel', async (req, res) => {
    try {
        const students = await Student.find({});
        logger.info(`Yêu cầu xuất Excel - Số lượng sinh viên: ${students.length}`);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Students");

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

        students.forEach(student => {
            worksheet.addRow(student);
        });

        res.setHeader('Content-Disposition', 'attachment; filename=students.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        const buffer = await workbook.xlsx.writeBuffer();
        res.send(buffer);

        logger.info("Xuất file Excel thành công!");
    } catch (err) {
        logger.error(`Lỗi khi xuất Excel: ${err.message}`);
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

// Lấy danh sách sinh viên + logger
router.get('/students', async (req, res) => {
    try {
        const students = await Student.find({});
        logger.info('Lấy danh sách sinh viên thành công.');
        res.json(students);
    } catch (err) {
        logger.error(`Lỗi khi lấy danh sách sinh viên: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

// Thêm sinh viên + logger
router.post('/students', async (req, res) => {
    try {
        const { email } = req.body;
        const config = await Config.findOne();
        const allowedDomains = config ? config.allowedEmailDomains : [];

        if (!allowedDomains.some(domain => email.endsWith(`@${domain}`))) {
            return res.status(400).json({ error: `Email không thuộc tên miền được phép! (${allowedDomains.join(', ')})` });
        }

        const student = new Student(req.body);
        await student.save();
        logger.info(`Thêm sinh viên mới: ${student.name} (MSSV: ${student.studentId})`);
        res.status(201).json({ message: 'Sinh viên đã được thêm!', student });
    } catch (err) {
        logger.error(`Lỗi khi thêm sinh viên: ${err.message}`);
        res.status(400).json({ error: err.message });
    }
});

//Xoá tất cả sinh viên
router.delete('/students/delete-all', async (req, res) => {
    try {
        await Student.deleteMany({});
        logger.info("Đã xóa tất cả sinh viên.");
        res.json({ message: "Tất cả sinh viên đã bị xóa!" });
    } catch (err) {
        logger.error(`Lỗi khi xóa tất cả sinh viên: ${err.message}`);
        res.status(500).json({ error: "Lỗi khi xóa tất cả sinh viên!" });
    }
});

// Cập nhật thông tin sinh viên, kiểm tra tên miền email + Logger
router.put('/students/:id', async (req, res) => {
    try {
        const { email } = req.body;
        const studentId = req.params.id;

        // Lấy danh sách tên miền email hợp lệ từ config
        const config = await Config.findOne();
        const allowedDomains = config ? config.allowedEmailDomains : [];

        // Kiểm tra email có nằm trong danh sách tên miền hợp lệ không
        if (!allowedDomains.some(domain => email.endsWith(`@${domain}`))) {
            logger.warn(`Email không hợp lệ khi chỉnh sửa: ${email} (Chỉ chấp nhận: ${allowedDomains.join(', ')})`);
            return res.status(400).json({ error: `Email không thuộc tên miền được cho phép! (${allowedDomains.join(', ')})` });
        }

        // Kiểm tra xem sinh viên có tồn tại không
        const existingStudent = await Student.findById(studentId);
        if (!existingStudent) {
            logger.warn(`Không tìm thấy sinh viên có ID: ${studentId}`);
            return res.status(404).json({ error: 'Không tìm thấy sinh viên!' });
        }

        // Cập nhật thông tin sinh viên
        const updatedStudent = await Student.findByIdAndUpdate(studentId, req.body, {
            new: true,
            runValidators: true
        });

        if (!updatedStudent) {
            logger.error(`Cập nhật thất bại cho sinh viên có ID: ${studentId}`);
            return res.status(500).json({ error: 'Cập nhật thất bại, vui lòng thử lại!' });
        }

        logger.info(`Cập nhật thành công sinh viên: ${updatedStudent.name} (ID: ${studentId}, Email: ${updatedStudent.email})`);
        res.json({ message: 'Cập nhật thành công!', student: updatedStudent });

    } catch (err) {
        logger.error(`Lỗi khi cập nhật sinh viên có ID ${req.params.id}: ${err.message}`);
        res.status(500).json({ error: 'Lỗi khi cập nhật sinh viên!' });
    }
});

// Xóa sinh viên + Logger
router.delete('/students/:id', async (req, res) => {
    try {
        await Student.findByIdAndDelete(req.params.id);
        logger.info(`Xóa sinh viên có ID: ${req.params.id}`);
        res.json({ message: 'Sinh viên đã bị xóa!' });
    } catch (err) {
        logger.error(`Lỗi khi xóa sinh viên: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

// Lấy phiên bản và ngày build
router.get('/version', (req, res) => {
    try {
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

        const versionInfo = {
            version: packageJson.version || 'Không rõ',
            build_date: packageJson.build_date || 'Không rõ'
        };

        logger.info(`Lấy thông tin version: ${JSON.stringify(versionInfo)}`);
        res.json(versionInfo);
    } catch (err) {
        logger.error(`Lỗi khi lấy thông tin version: ${err.message}`);
        res.status(500).json({ error: 'Lỗi khi lấy thông tin phiên bản!' });
    }
});

// Lấy danh sách tên miền email hợp lệ + Logger
router.get('/config/email-domains', async (req, res) => {
    try {
        const config = await Config.findOne();
        res.json(config ? config.allowedEmailDomains : []);
    } catch (err) {
        res.status(500).json({ error: "Lỗi khi lấy danh sách tên miền email hợp lệ!" });
    }
});

router.post('/config/email-domains', async (req, res) => {
    try {
        let config = await Config.findOne();
        if (!config) {
            config = new Config({});
        }

        const newDomains = req.body.allowedEmailDomains || [];

        // Chỉ thêm những tên miền chưa tồn tại
        newDomains.forEach(domain => {
            if (!config.allowedEmailDomains.includes(domain)) {
                config.allowedEmailDomains.push(domain);
            }
        });

        await config.save();
        logger.info(`Danh sách tên miền email sau khi cập nhật: ${config.allowedEmailDomains.join(', ')}`);
        res.json({ message: "Cập nhật tên miền email thành công!", allowedEmailDomains: config.allowedEmailDomains });
    } catch (err) {
        logger.error(`Lỗi khi cập nhật danh sách tên miền email: ${err.message}`);
        res.status(500).json({ error: "Lỗi khi cập nhật danh sách tên miền email!" });
    }
});

export default router;

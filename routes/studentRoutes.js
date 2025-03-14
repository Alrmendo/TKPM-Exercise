import { getConfirmationPage } from '../controllers/studentController.js';
import { updateStudentPurpose } from '../controllers/studentController.js';
import { getStudentList, getStudentById } from '../controllers/studentController.js';
import { exportHTML, exportMarkdown, exportPDF } from '../controllers/studentController.js';
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
router.get('/confirmation', getConfirmationPage);
router.get('/confirmation', getStudentList);
router.get('/api/student/:studentId', getStudentById);
router.post('/update-purpose', updateStudentPurpose);
router.get('/export/html', exportHTML);
router.get('/export/md', exportMarkdown);
router.get('/export/pdf', exportPDF);

const upload = multer({ dest: 'uploads/' });

// Cấu hình thời gian giới hạn xóa (30 phút)
const DELETE_TIME_LIMIT = 30 * 60 * 1000;


// Import JSON + Logger
router.post('/import/json', upload.single('file'), async (req, res) => {
    try {
        logger.info(`Import JSON bắt đầu: ${req.file.originalname}`);
        const data = JSON.parse(fs.readFileSync(req.file.path, 'utf-8'));

        let importedCount = 0;
        let config = await Config.findOne();
        const allowedDomains = config?.allowedEmailDomains || [];

        for (const student of data) {
            const emailDomain = student.email.split('@').pop();
            if (!allowedDomains.includes(emailDomain)) {
                logger.warn(`Bỏ qua sinh viên ${student.name} - Email không hợp lệ: ${student.email}`);
                continue; // Bỏ qua sinh viên có email sai
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

        logger.info(`Import JSON hoàn tất: ${importedCount} sinh viên mới.`);
        res.json({ message: `Import thành công! ${importedCount} sinh viên mới được thêm.` });
    } catch (err) {
        logger.error(`Lỗi khi import JSON: ${err.message}`);
        res.status(500).json({ error: "Lỗi khi import JSON!" });
    }
});

// Import Excel + Logger
router.post('/import/excel', upload.single('file'), async (req, res) => {
    try {
        logger.info(`Bắt đầu import file Excel: ${req.file.originalname}`);

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);
        const worksheet = workbook.worksheets[0];

        let importedCount = 0;
        let config = await Config.findOne();
        const allowedDomains = config?.allowedEmailDomains || [];

        // Lấy hàng đầu tiên làm header
        const headers = {};
        worksheet.getRow(1).eachCell((cell, colNumber) => {
            headers[cell.value] = colNumber;  // Lưu vị trí của từng cột theo tên
        });

        if (!headers["Email"]) {
            return res.status(400).json({ error: "Thiếu cột bắt buộc: Email" });
        }

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
            const email = row.getCell(headers["Email"]).value;
            const emailDomain = email.split('@').pop();

            if (!allowedDomains.includes(emailDomain)) {
                logger.warn(`Bỏ qua sinh viên ở dòng ${i} - Email không hợp lệ: ${email}`);
                continue; // Bỏ qua sinh viên có email sai
            }

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

            const existingStudent = await Student.findOne({ studentId: studentData.studentId });
            if (existingStudent) {
                await Student.updateOne({ studentId: studentData.studentId }, studentData);
            } else {
                await Student.create(studentData);
                importedCount++;
            }
        }

        logger.info(`Import Excel hoàn tất: ${importedCount} sinh viên mới.`);
        res.json({ message: `Import thành công! ${importedCount} sinh viên mới được thêm.` });
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
        if (req.body.allowedEmailDomains) {
            config.allowedEmailDomains = req.body.allowedEmailDomains;
        }

        await config.save();
        res.json({ message: "Cập nhật thành công!", config });
    } catch (err) {
        res.status(500).json({ error: "Lỗi khi cập nhật danh sách cấu hình!" });
    }
});

// Lấy danh sách tên miền email hợp lệ
router.get('/config/email-domains', async (req, res) => {
    try {
        let config = await Config.findOne();
        if (!config) {
            config = await Config.create({});
        }
        res.json(config.allowedEmailDomains);
    } catch (err) {
        res.status(500).json({ error: "Lỗi khi lấy danh sách tên miền email!" });
    }
});

// Thêm tên miền email mới
router.post('/config/email-domains', async (req, res) => {
    try {
        const { domain } = req.body;
        if (!domain) return res.status(400).json({ error: "Tên miền không hợp lệ!" });

        let config = await Config.findOne();
        if (!config) {
            config = await Config.create({});
        }

        if (!config.allowedEmailDomains.includes(domain)) {
            config.allowedEmailDomains.push(domain);
            await config.save();
        }

        res.json({ message: "Đã thêm tên miền!", allowedEmailDomains: config.allowedEmailDomains });
    } catch (err) {
        res.status(500).json({ error: "Lỗi khi thêm tên miền email!" });
    }
});

// Xóa tên miền email
router.delete('/config/email-domains/:domain', async (req, res) => {
    try {
        const domainToRemove = req.params.domain;
        let config = await Config.findOne();
        if (!config) {
            config = await Config.create({});
        }

        config.allowedEmailDomains = config.allowedEmailDomains.filter(domain => domain !== domainToRemove);
        await config.save();

        res.json({ message: "Đã xóa tên miền!", allowedEmailDomains: config.allowedEmailDomains });
    } catch (err) {
        res.status(500).json({ error: "Lỗi khi xóa tên miền email!" });
    }
});

// Lấy danh sách mã quốc gia hợp lệ
router.get('/config/phone-codes', async (req, res) => {
    try {
        let config = await Config.findOne();
        if (!config) {
            config = await Config.create({});
        }
        res.json(config.phoneCountryCodes);
    } catch (err) {
        res.status(500).json({ error: "Lỗi khi lấy danh sách mã quốc gia!" });
    }
});

// Thêm mã quốc gia mới
router.post('/config/phone-codes', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code || !code.startsWith('+')) return res.status(400).json({ error: "Mã quốc gia không hợp lệ!" });

        let config = await Config.findOne();
        if (!config) {
            config = await Config.create({});
        }

        if (!config.phoneCountryCodes.includes(code)) {
            config.phoneCountryCodes.push(code);
            await config.save();
        }

        res.json({ message: "Đã thêm mã quốc gia!", phoneCountryCodes: config.phoneCountryCodes });
    } catch (err) {
        res.status(500).json({ error: "Lỗi khi thêm mã quốc gia!" });
    }
});

// Xóa mã quốc gia
router.delete('/config/phone-codes/:code', async (req, res) => {
    try {
        const codeToRemove = req.params.code;
        let config = await Config.findOne();
        if (!config) {
            config = await Config.create({});
        }

        config.phoneCountryCodes = config.phoneCountryCodes.filter(code => code !== codeToRemove);
        await config.save();

        res.json({ message: "Đã xóa mã quốc gia!", phoneCountryCodes: config.phoneCountryCodes });
    } catch (err) {
        res.status(500).json({ error: "Lỗi khi xóa mã quốc gia!" });
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
        const { email, phone } = req.body;

        // Lấy danh sách domain email hợp lệ và mã quốc gia hợp lệ từ Config
        let config = await Config.findOne();
        const allowedDomains = config?.allowedEmailDomains || [];
        const allowedPhoneCodes = config?.phoneCountryCodes || [];
        const enableRules = config?.enableRules ?? true;

        // Kiểm tra email có hợp lệ không
        if (enableRules) {
            if (email) {
                const emailDomain = email.split('@').pop();
                if (!allowedDomains.includes(emailDomain)) {
                    return res.status(400).json({ error: `Email phải thuộc tên miền hợp lệ: ${allowedDomains.join(', ')}` });
                }
            }

            // Kiểm tra số điện thoại có hợp lệ không
            if (phone) {
                if (!allowedPhoneCodes.some(code => phone.startsWith(code))) {
                    return res.status(400).json({ error: `Số điện thoại phải bắt đầu bằng ${allowedPhoneCodes.join(', ')}` });
                }
            }
        }

        // Thêm sinh viên mới vào database
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

// Cập nhật sinh viên + Logger
router.put('/students/:id', async (req, res) => {
    try {
        const studentId = req.params.id;
        const { email, phone, status } = req.body;

        logger.info(`Yêu cầu cập nhật sinh viên có ID: ${studentId}`);

        // Kiểm tra xem sinh viên có tồn tại không
        const existingStudent = await Student.findById(studentId);
        if (!existingStudent) {
            logger.warn(`Không tìm thấy sinh viên có ID: ${studentId}`);
            return res.status(404).json({ error: 'Không tìm thấy sinh viên!' });
        }

        // Lấy danh sách domain email hợp lệ và mã quốc gia hợp lệ từ Config
        let config = await Config.findOne();
        const allowedDomains = config?.allowedEmailDomains || [];
        const allowedPhoneCodes = config?.phoneCountryCodes || [];
        const statusRules = config?.statusRules || {};
        const enableRules = config?.enableRules ?? true;

        if (enableRules) {
            // Kiểm tra email có đúng domain hợp lệ không
            if (email) {
                const emailDomain = email.split('@').pop();
                if (!allowedDomains.includes(emailDomain)) {
                    return res.status(400).json({ error: `Email phải thuộc tên miền hợp lệ: ${allowedDomains.join(', ')}` });
                }
            }

            // Kiểm tra số điện thoại có đúng mã quốc gia không
            if (phone) {
                if (!allowedPhoneCodes.some(code => phone.startsWith(code))) {
                    return res.status(400).json({ error: `Số điện thoại phải bắt đầu bằng ${allowedPhoneCodes.join(', ')}` });
                }
            }

            console.log("Đang xử lý cập nhật trạng thái...");
            console.log("Trạng thái hiện tại của sinh viên:", existingStudent.status);
            console.log("Trạng thái mới:", status);
            console.log("Quy tắc trạng thái từ config:", statusRules);
            console.log("Các trạng thái có thể chuyển từ", existingStudent.status, ":", statusRules[existingStudent.status]);

            // Kiểm tra xem trạng thái mới có hợp lệ không
            if (status && statusRules[existingStudent.status]) {
                const allowedNextStatuses = statusRules[existingStudent.status];
                if (!allowedNextStatuses.includes(status)) {
                    return res.status(400).json({ error: `Không thể đổi từ "${existingStudent.status}" sang "${status}"!` });
                }
            }
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

        logger.info(`Cập nhật thành công sinh viên: ${updatedStudent.name} (ID: ${studentId})`);
        res.json({ message: 'Cập nhật thành công!', student: updatedStudent });

    } catch (err) {
        logger.error(`Lỗi khi cập nhật sinh viên có ID ${req.params.id}: ${err.message}`);
        res.status(500).json({ error: 'Lỗi khi cập nhật sinh viên!' });
    }
});

// Xóa sinh viên + Logger
router.delete('/students/:id', async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ error: 'Không tìm thấy sinh viên!' });
        }

        const currentTime = Date.now();
        const creationTime = new Date(student.creationDate).getTime();

        // Kiểm tra nếu sinh viên đã tồn tại hơn 30 phút
        if (currentTime - creationTime > DELETE_TIME_LIMIT) {
            return res.status(403).json({ error: 'Chỉ có thể xóa sinh viên trong vòng 30 phút sau khi tạo!' });
        }

        await Student.findByIdAndDelete(req.params.id);
        logger.info(`Xóa sinh viên có ID: ${req.params.id}`);

        res.json({ message: 'Sinh viên đã bị xóa!' });
    } catch (err) {
        logger.error(`Lỗi khi xóa sinh viên: ${err.message}`);
        res.status(500).json({ error: 'Lỗi khi xóa sinh viên!' });
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

//EX4
router.post('/config/toggle-rules', async (req, res) => {
    try {
        const { enableRules } = req.body;

        let config = await Config.findOne();
        if (!config) {
            config = new Config({});
        }

        config.enableRules = enableRules;
        await config.save();

        res.json({ message: `Quy định đã được ${enableRules ? 'bật' : 'tắt'}!`, enableRules });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi khi cập nhật trạng thái quy định!' });
    }
});


export default router;

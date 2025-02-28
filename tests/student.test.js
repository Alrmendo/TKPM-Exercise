import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../index.js';
import Student from '../models/Student.js';
import Config from '../models/Config.js';  // Thêm import Config

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }

    await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });

    // **Thêm Config vào môi trường test**
    const existingConfig = await Config.findOne();
    if (!existingConfig) {
        await Config.create({
            allowedEmailDomains: ["student.university.edu.vn"],  // Đảm bảo email hợp lệ
            phoneCountryCodes: ["+84", "03", "05", "07", "08", "09"]
        });
    }
});

afterAll(async () => {
    await mongoose.connection.close();
    await mongoServer.stop();
});

describe('API Sinh Viên', () => {
    test('Lấy danh sách sinh viên - GET /students', async () => {
        const response = await request(app).get('/students');
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThanOrEqual(0);
    });

    test('Thêm sinh viên mới - POST /students', async () => {
        const newStudent = {
            studentId: "SV001",
            name: "Nguyễn Văn A",
            birthdate: "2000-01-01",
            gender: "Nam",
            department: "Khoa Công Nghệ",
            status: "Đang học",
            email: "student@student.university.edu.vn",
            phone: "0901234567",
            course: "K22",
            program: "Chất lượng cao",
            address: "Hà Nội"
        };

        // **Debug log để kiểm tra Config**
        const config = await Config.findOne();
        console.log("Loaded Config:", config);
        console.log("Allowed Email Domains:", config?.allowedEmailDomains);

        const response = await request(app).post('/students').send(newStudent);
        console.log("Kết quả từ API:", response.body); // Debug response
        console.log("Response Status:", response.status);
        console.log("Response Body:", response.body);
        expect(response.status).toBe(201);
        expect(response.body.student.name).toBe("Nguyễn Văn A");
    });

    test('Không thể thêm sinh viên có studentId trùng', async () => {
        await Student.create({
            studentId: "SV004",
            name: "Nguyễn Văn C",
            email: "nguyenvanc@student.university.edu.vn"
        });

        const duplicateStudent = {
            studentId: "SV004",
            name: "Nguyễn Văn D",
            email: "nguyenvand@student.university.edu.vn"
        };

        const response = await request(app).post('/students').send(duplicateStudent);
        expect(response.status).toBe(400); // API phải trả lỗi vì `studentId` đã tồn tại
    });

    test('Cập nhật thông tin sinh viên - PUT /students/:id', async () => {
        const student = await Student.create({
            studentId: "SV002",
            name: "Lê Thị B",
            email: "lethib@student.university.edu.vn"
        });

        const updateData = { name: "Lê Bảo B" };
        const response = await request(app).put(`/students/${student._id}`).send(updateData);
        expect(response.status).toBe(200);
        expect(response.body.student.name).toBe("Lê Bảo B");
    });

    test('Xóa sinh viên - DELETE /students/:id', async () => {
        const student = await Student.create({
            studentId: "SV003",
            name: "Trần Văn C",
            email: "tranvc@student.university.edu.vn"
        });

        const response = await request(app).delete(`/students/${student._id}`);
        expect(response.status).toBe(200);
        expect(response.body.message).toBe("Sinh viên đã bị xóa!");
    });
});

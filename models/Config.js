import mongoose from 'mongoose';

const configSchema = new mongoose.Schema({
    departments: { type: [String], default: ["Khoa Luật", "Khoa Tiếng Anh thương mại", "Khoa Tiếng Nhật", "Khoa Tiếng Pháp"] },
    statuses: { type: [String], default: ["Đang học", "Đã tốt nghiệp", "Đã thôi học", "Tạm dừng học"] },
    programs: { type: [String], default: ["Chất lượng cao", "Đại trà"] },
    allowedEmailDomains: { type: [String], default: ["student.university.edu.vn"] }
});

const Config = mongoose.model('Config', configSchema);
export default Config;
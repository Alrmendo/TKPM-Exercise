import mongoose from 'mongoose';

const configSchema = new mongoose.Schema({
    departments: { type: [String], default: ["Khoa Luật", "Khoa Tiếng Anh thương mại", "Khoa Tiếng Nhật", "Khoa Tiếng Pháp"] },
    statuses: { type: [String], default: ["Đang học", "Đã tốt nghiệp", "Đã thôi học", "Tạm dừng học"] },
    programs: { type: [String], default: ["Chất lượng cao", "Đại trà"] },
    allowedEmailDomains: { type: [String], default: ["student.university.edu.vn"] },
    phoneCountryCodes: { type: [String], default: ["+84", "03", "05", "07", "08", "09"] },
    statusRules: {
        type: Map,
        of: [String],
        default: {
            "Đang học": ["Bảo lưu", "Đã tốt nghiệp", "Đình chỉ"],
            "Đã tốt nghiệp": [],
        }
    },
    enableRules: { type: Boolean, default: true }
});

const Config = mongoose.model('Config', configSchema);
export default Config;
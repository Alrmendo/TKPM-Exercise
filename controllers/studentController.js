import Student from '../models/Student.js';
import pdf from 'html-pdf-node';

export const getStudentPage = (req, res) => {
    res.render('ex1');
};

export const getConfirmationPage = async (req, res) => {
    try {
        const students = await Student.find({}).lean(); // Lấy toàn bộ danh sách sinh viên
        res.render('confirmation', { students }); // Truyền `students` vào template
    } catch (error) {
        res.status(500).send("Lỗi khi lấy danh sách sinh viên.");
    }
};

export const getStudentList = async (req, res) => {
    try {
        const students = await Student.find({});
        res.render('confirmation', { students });
    } catch (error) {
        res.status(500).send("Lỗi khi lấy danh sách sinh viên.");
    }
};

export const getStudentById = async (req, res) => {
    try {
        const student = await Student.findOne({ studentId: req.params.studentId });

        if (!student) {
            return res.status(404).json({ error: "Không tìm thấy sinh viên." });
        }

        res.json(student);
    } catch (error) {
        res.status(500).json({ error: "Lỗi server." });
    }
};

export const updateStudentPurpose = async (req, res) => {
    try {
        const { studentId, purpose } = req.body;

        if (!studentId || !purpose) {
            return res.status(400).json({ error: "Thiếu thông tin studentId hoặc purpose." });
        }

        const student = await Student.findOne({ studentId });

        if (!student) {
            return res.status(404).json({ error: "Không tìm thấy sinh viên." });
        }

        student.purpose = purpose;
        await student.save();

        res.json({ message: "Cập nhật mục đích thành công!", student });
    } catch (error) {
        res.status(500).json({ error: "Lỗi server khi cập nhật mục đích." });
    }
};

const formatPurpose = (purpose) => {
    const purposeMap = {
        "vay_von": "Xác nhận đang học để vay vốn ngân hàng",
        "tam_hoan_nghia_vu": "Xác nhận làm thủ tục tạm hoãn nghĩa vụ quân sự",
        "ho_so_xin_viec": "Xác nhận làm hồ sơ xin việc / thực tập",
        "khac": "Xác nhận lý do khác"
    };
    return purposeMap[purpose] || "Không có thông tin";
};

export const exportHTML = async (req, res) => {
    try {
        const student = await Student.findOne({ studentId: req.query.studentId });

        if (!student) {
            return res.status(404).send("Không tìm thấy sinh viên.");
        }

        const purposeText = formatPurpose(student.purpose);

        const htmlContent = `
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="UTF-8">
                <title>Giấy Xác Nhận Sinh Viên</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; padding: 20px; background-color: #f4f4f4; }
                    .container { max-width: 800px; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); }
                    .header { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 20px; }
                    .info { margin-bottom: 10px; }
                    .section-title { font-weight: bold; margin-top: 15px; }
                    .signature { margin-top: 30px; text-align: right; font-weight: bold; }
                    .divider { border-top: 2px solid #000; margin-top: 10px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>TRƯỜNG ĐẠI HỌC KHOA HỌC TỰ NHIÊN</h2>
                        <p>📍 Địa chỉ: 227 Nguyễn Văn Cừ, Quận 5, TP.HCM</p>
                        <p>📞 (028) 38 354 080 | ✉️ contact@hcmus.edu.vn</p>
                        <hr class="divider">
                    </div>

                    <h2 class="text-center">GIẤY XÁC NHẬN TÌNH TRẠNG SINH VIÊN</h2>
                    <p class="info">Trường Đại học Khoa học Tự nhiên xác nhận:</p>

                    <h3 class="section-title">1. Thông tin sinh viên:</h3>
                    <p><strong>Họ và tên:</strong> ${student.name}</p>
                    <p><strong>Mã số sinh viên:</strong> ${student.studentId}</p>
                    <p><strong>Ngày sinh:</strong> ${student.birthdate || 'N/A'}</p>
                    <p><strong>Giới tính:</strong> ${student.gender}</p>
                    <p><strong>Khoa:</strong> ${student.department}</p>
                    <p><strong>Chương trình đào tạo:</strong> ${student.program}</p>
                    <p><strong>Khóa:</strong> ${student.course}</p>

                    <h3 class="section-title">2. Tình trạng sinh viên hiện tại:</h3>
                    <p>${student.status}</p>

                    <h3 class="section-title">3. Mục đích xác nhận:</h3>
                    <p>${purposeText}</p>

                    <h3 class="section-title">4. Thời gian cấp giấy:</h3>
                    <p>Giấy xác nhận có hiệu lực đến ngày: <strong>${new Date().getFullYear() + 1}</strong></p>
                    
                    <div class="signature">
                        📅 Ngày cấp: ${new Date().toLocaleDateString()}
                        <br><br>
                        🖋 <strong>Trưởng Phòng Đào Tạo</strong>
                        <p>(Ký, ghi rõ họ tên, đóng dấu)</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        res.setHeader('Content-Disposition', 'attachment; filename=giay_xac_nhan.html');
        res.setHeader('Content-Type', 'text/html');
        res.send(htmlContent);
    } catch (error) {
        res.status(500).send("Lỗi khi xuất HTML.");
    }
};

export const exportMarkdown = async (req, res) => {
    try {
        const student = await Student.findOne({ studentId: req.query.studentId });

        if (!student) {
            return res.status(404).send("Không tìm thấy sinh viên.");
        }

        const purposeText = formatPurpose(student.purpose);

        const markdownContent = `
# TRƯỜNG ĐẠI HỌC KHOA HỌC TỰ NHIÊN  
### 📍 Địa chỉ: 227 Nguyễn Văn Cừ, Quận 5, TP.HCM  
### 📞 (028) 38 354 080 | ✉️ contact@hcmus.edu.vn  

---

## GIẤY XÁC NHẬN TÌNH TRẠNG SINH VIÊN  

Trường Đại học Khoa Học Tự Nhiên xác nhận:  

### **Thông tin sinh viên:**  
- **Họ và tên:** ${student.name}  
- **Mã số sinh viên:** ${student.studentId}  
- **Ngày sinh:** ${student.birthdate || 'N/A'}  
- **Giới tính:** ${student.gender}  
- **Khoa:** ${student.department}  
- **Chương trình đào tạo:** ${student.program}  
- **Khóa:** ${student.course}  

### **Tình trạng sinh viên hiện tại:**  
> ${student.status}  

### **Mục đích xác nhận:**  
> ${purposeText}  

### **Thời gian cấp giấy:**  
- Giấy xác nhận có hiệu lực đến ngày: **${new Date().getFullYear() + 1}**  

---

📅 **Ngày cấp:** ${new Date().toLocaleDateString()}  

🖋 **Trưởng Phòng Đào Tạo**  
_(Ký, ghi rõ họ tên, đóng dấu)_
        `;

        res.setHeader('Content-Disposition', 'attachment; filename=giay_xac_nhan.md');
        res.setHeader('Content-Type', 'text/markdown');
        res.send(markdownContent);
    } catch (error) {
        res.status(500).send("Lỗi khi xuất Markdown.");
    }
};

export const exportPDF = async (req, res) => {
    try {
        const student = await Student.findOne({ studentId: req.query.studentId });

        if (!student) {
            return res.status(404).send("Không tìm thấy sinh viên.");
        }

        const purposeText = formatPurpose(student.purpose);

        // HTML giống `confirmation.hbs`
        const htmlContent = `
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="UTF-8">
                <title>Giấy Xác Nhận Sinh Viên</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; padding: 20px; }
                    .container { max-width: 800px; border: 2px solid black; padding: 20px; }
                    .header { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 20px; }
                    .info { margin-bottom: 10px; font-size: 16px; }
                    .section-title { font-weight: bold; margin-top: 15px; font-size: 18px; }
                    .signature { margin-top: 30px; text-align: right; font-weight: bold; font-size: 16px; }
                    .divider { border-top: 2px solid #000; margin-top: 10px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>TRƯỜNG ĐẠI HỌC KHOA HỌC TỰ NHIÊN</h2>
                        <p>📍 Địa chỉ: 227 Nguyễn Văn Cừ, Quận 5, TP.HCM</p>
                        <p>📞 (028) 38 354 080 | ✉️ contact@hcmus.edu.vn</p>
                        <hr class="divider">
                    </div>

                    <h2 class="text-center">GIẤY XÁC NHẬN TÌNH TRẠNG SINH VIÊN</h2>
                    <p class="info">Trường Đại học Khoa học Tự nhiên xác nhận:</p>

                    <h3 class="section-title">1. Thông tin sinh viên:</h3>
                    <p><strong>Họ và tên:</strong> ${student.name}</p>
                    <p><strong>Mã số sinh viên:</strong> ${student.studentId}</p>
                    <p><strong>Ngày sinh:</strong> ${student.birthdate || 'N/A'}</p>
                    <p><strong>Giới tính:</strong> ${student.gender}</p>
                    <p><strong>Khoa:</strong> ${student.department}</p>
                    <p><strong>Chương trình đào tạo:</strong> ${student.program}</p>
                    <p><strong>Khóa:</strong> ${student.course}</p>

                    <h3 class="section-title">2. Tình trạng sinh viên hiện tại:</h3>
                    <p>${student.status}</p>

                    <h3 class="section-title">3. Mục đích xác nhận:</h3>
                    <p>${purposeText}</p>

                    <h3 class="section-title">4. Thời gian cấp giấy:</h3>
                    <p>Giấy xác nhận có hiệu lực đến ngày: <strong>${new Date().getFullYear() + 1}</strong></p>
                    
                    <div class="signature">
                        📅 Ngày cấp: ${new Date().toLocaleDateString()}
                        <br><br>
                        🖋 <strong>Trưởng Phòng Đào Tạo</strong>
                        <p>(Ký, ghi rõ họ tên, đóng dấu)</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        // Cấu hình file PDF
        let file = { content: htmlContent };
        let options = { format: 'A4' };

        // Tạo PDF
        pdf.generatePdf(file, options).then(pdfBuffer => {
            res.setHeader('Content-Disposition', 'attachment; filename=giay_xac_nhan.pdf');
            res.setHeader('Content-Type', 'application/pdf');
            res.send(pdfBuffer);
        }).catch(error => {
            console.error("Lỗi khi tạo PDF:", error);
            res.status(500).send("Lỗi khi xuất PDF.");
        });

    } catch (error) {
        console.error("Lỗi khi tạo PDF:", error);
        res.status(500).send("Lỗi khi xuất PDF.");
    }
};
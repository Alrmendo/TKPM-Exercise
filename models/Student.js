import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
    studentId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    birthdate: { type: String },
    gender: { type: String },
    department: { type: String },
    status: { type: String },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    course: { type: String },
    program: { type: String },
    address: { type: String },
    purpose: { type: String, default: "" },
    creationDate: { type: Date, default: Date.now }
});

const Student = mongoose.model('Student', studentSchema);
export default Student;
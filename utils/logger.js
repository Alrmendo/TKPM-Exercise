import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import DailyRotateFile from 'winston-daily-rotate-file';

// Lấy đường dẫn hiện tại của file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cấu hình logger
const logger = winston.createLogger({
    level: 'info',  // Ghi log từ mức "info" trở lên
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level.toUpperCase()}: ${message}`)
    ),
    transports: [
        new winston.transports.Console(), // Ghi log lên console
        new winston.transports.File({ filename: path.join(__dirname, '../logs/error.log'), level: 'error' }), // Lưu log lỗi vào error.log
        new DailyRotateFile({
            filename: path.join(__dirname, '../logs/application-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '10m', // Giới hạn 10MB
            maxFiles: '14d' // Lưu log 14 ngày
        })
    ]
});

// Hiển thị log debug, chưa ra production (tạm thời)
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

export default logger;

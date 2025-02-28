import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { engine } from 'express-handlebars';
import studentRoutes from './routes/studentRoutes.js';
import databaseService from './database/db.js';
import './buildDate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

// Kết nối MongoDB
databaseService.connectDatabase();

// Cấu hình Handlebars với helper `json`
app.engine('hbs', engine({
    extname: '.hbs',
    layoutsDir: path.join(__dirname, 'views'), 
    defaultLayout: 'layout',
    partialsDir: path.join(__dirname, 'views/partials'),
    helpers: {
        json: function (context) {
            return JSON.stringify(context);
        }
    },
    runtimeOptions: {
        allowProtoPropertiesByDefault: true,
        allowProtoMethodsByDefault: true
    }
}));

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Middleware xử lý dữ liệu form
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Cấu hình public folder (chứa CSS, JS, Images)
app.use(express.static(path.join(__dirname, 'public')));

// Định tuyến
app.use('/', studentRoutes);

// Chạy server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
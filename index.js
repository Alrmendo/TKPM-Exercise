const express = require('express');
const path = require('path');
const studentRoutes = require('./routes/studentRoutes');

const app = express();
const PORT = 3000;

// Cấu hình Handlebars
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Middleware xử lý dữ liệu form
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Định tuyến
app.use('/', studentRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

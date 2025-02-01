# TKPM-EXERCISE

## 1. Chạy web trực tiếp
Dạ do web em deploy bằng một nền tảng miễn phí (Render). Do đó, tốc độ tải có thể hơi chậm. Trong trường hợp trang load lâu quá, thầy có thể thử:
- Thầy ráng đợi một lúc để trang web hiển thị.
- Nếu vẫn chưa load xong, thầy hãy đóng tab đó và truy cập lại link ạ.

🔗 **Link chạy web:** https://tkpm-ex1.onrender.com/

---

## 2. Hướng dẫn cài đặt và chạy chương trình trên máy

### 2.1. Cấu trúc mã nguồn

```
TKPM-EXERCISE/
│── controllers/            # Chứa các controller xử lý logic
│   ├── studentController.js # Controller mẫu
│── public/                 # Chứa các tài nguyên tĩnh (CSS, hình ảnh, JS...)
│   ├── css/
│   │   ├── app.css         # File CSS chính
│   ├── images/
│   │   ├── logo.png       # Logo trang web
│── routes/                 # Chứa các route định tuyến
│── views/                  # Chứa giao diện sử dụng Handlebars
│   ├── ex1.hbs
│   ├── layout.hbs
│── index.js                # File chính khởi chạy server
│── package.json            # Danh sách dependencies
│── package-lock.json       # File lock version dependencies
│── README.md               # Hướng dẫn sử dụng
```

### 2.2. Cài đặt và chạy ứng dụng

#### Bước 1: Cài đặt Node.js
Ứng dụng yêu cầu **Node.js** và **npm**. Nếu chưa có, hãy tải và cài đặt từ:
- [Node.js Download](https://nodejs.org/)

#### Bước 2: Clone repository
Mở terminal/cmd và chạy lệnh sau để tải mã nguồn:
```sh
git clone https://github.com/Alrmendo/TKPM-Exercise.git
cd TKPM-EXERCISE
```

#### Bước 3: Cài đặt dependencies
Chạy lệnh:
```sh
npm install
```

#### Bước 4: Chạy server
Chạy lệnh:
```sh
node index.js
```
Hoặc nếu dùng `nodemon` (cần cài trước bằng `npm install -g nodemon`):
```sh
nodemon index.js
```

#### Bước 5: Truy cập web
Sau khi server chạy thành công, mở trình duyệt và truy cập:
```
http://localhost:3000
```
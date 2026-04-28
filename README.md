# CNXH Quiz

Ứng dụng ôn thi trắc nghiệm CNXH, dùng Vite React cho frontend, Next.js API cho backend và PostgreSQL cho database. Toàn bộ app chạy được bằng Docker.

## Chạy bằng Docker

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- PostgreSQL: localhost:5432

Tài khoản admin mặc định được seed khi backend khởi động:

- Tên đăng nhập: `admin`
- Mật khẩu: `Admin@12345`

Hãy đổi `JWT_SECRET` và `ADMIN_PASSWORD` trong `.env` trước khi dùng thật.

## Chạy local không Docker

Khuyến nghị dùng Node 22 LTS. Repo có sẵn `.nvmrc`.

```bash
npm --prefix backend install
npm --prefix frontend install
npm run dev:backend
npm run dev:frontend
```

Khi chạy local, backend cần biến môi trường `DATABASE_URL` trỏ tới PostgreSQL.

## Slide PDF ôn tập

Đặt PDF bài giảng trong thư mục `slide/` ở root repo, chia theo 4 thư mục môn học. Backend đọc trực tiếp thư mục này và stream PDF qua `/api/slides`, vì vậy PDF không bị đóng gói vào bundle frontend.

Với Docker, `docker-compose.yml` và `docker-compose.prod.yml` đã mount `./slide` vào backend dưới dạng read-only tại `/app/slide`.

## Chạy production bằng Docker

Tạo file `.env.production` từ `.env.production.example`, đổi toàn bộ mật khẩu/secret, rồi chạy:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Mặc định production chỉ mở frontend tại `APP_PORT=8088`; backend và PostgreSQL nằm trong network Docker nội bộ.

## Logic bảo mật chính

- Không có đăng ký công khai.
- Mật khẩu được hash bằng bcrypt.
- API dùng JWT kèm session id và luôn kiểm tra session trong database.
- Tài khoản thường chỉ có một phiên hoạt động. Khi đăng nhập ở thiết bị khác, phiên cũ bị vô hiệu hóa và frontend sẽ tự đăng xuất sau lần kiểm tra phiên kế tiếp.
- Admin có thể quản lý nhiều phiên, tạo/sửa/xóa tài khoản và thêm/sửa/ẩn câu hỏi.
- Truy vấn database dùng tham số hóa, không nối chuỗi SQL từ dữ liệu người dùng.

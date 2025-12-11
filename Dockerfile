# Sử dụng Node.js phiên bản nhẹ (Alpine Linux)
FROM node:18-alpine

# Thiết lập thư mục làm việc
WORKDIR /app

# Copy file định nghĩa dependencies trước để tận dụng Docker cache
COPY package*.json ./

# Cài đặt dependencies
RUN npm install

# Copy toàn bộ mã nguồn vào container
COPY . .

# Thiết lập biến môi trường (Có thể ghi đè khi chạy)
ENV NODE_ENV=production

# Lệnh khởi động "Neural Link"
CMD ["node", "scripts/telegram_service_v2.js"]

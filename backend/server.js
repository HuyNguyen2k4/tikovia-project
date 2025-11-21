require('dotenv').config(); // Load biến môi trường từ .env
// require('module-alias/register');
// ✅ THAY ĐỔI: Load custom module alias thay vì module-alias/register
require('./src/moduleAlias');

const express = require('express');
const multer = require('multer');
const qs = require('qs');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { testConnection } = require('./src/config/dbconnect');
// const initRoutes = require('./src/routes/indexRoutes');
const initRoutes = require('@routes/indexRoutes'); // ✅ Test alias
// const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const passport = require('passport');
const session = require('express-session');
// Passport.js configuration
require('./src/config/passport');

const http = require('http');
const { Server } = require('socket.io');
const setupUserStatusSocket = require('./src/socket/userStatusSocket');
const { initNotificationSocket } = require('./src/socket/notificationSocket');
const { startInventoryLotAlertJob } = require('./src/jobs/inventoryLotAlertJob');

const app = express();
const port = process.env.PORT || 3000;
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL,
        credentials: true,
    },
});

// Middleware
app.use(
    cors({
        origin: process.env.CLIENT_URL, // hoặc domain frontend
        credentials: true,
    })
);
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// Ghi đè query parser mặc định của Express để parse query strings phức tạp
app.set('query parser', (str) => qs.parse(str));

// Passport.js setup
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }, // Chỉ nên đặt secure: true nếu sử dụng HTTPS
    })
);

app.use(passport.initialize());
app.use(passport.session());

// // EJS setup with layouts
// app.use(expressLayouts);
// app.set('view engine', 'ejs');
// app.use(express.static(path.join(__dirname, 'public')));
// app.set('views', path.join(__dirname, 'src/views'));
// app.set('layout', 'layouts/main'); // Default layout

// Database connect
testConnection();

// Handle routes
initRoutes(app);

// Socket.IO setup
setupUserStatusSocket(io);
initNotificationSocket(io);

// Khởi động job kiểm tra hạn sử dụng của lô hàng
startInventoryLotAlertJob();

server.listen(port, () => {
    console.log(`✅ Server running on http://localhost:${port}/`);
});

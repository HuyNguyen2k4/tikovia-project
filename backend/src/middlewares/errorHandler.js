const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);
    res.json({
        success: false,
        message: `${err?.name}: ${err?.message}`,
        // stack: process.env.NODE_ENV === "production" ? null : err.stack,
    });
    // Log the error to the console for debugging
    console.error(`${err?.name}: ${err?.message} \n Stack: ${err?.stack}`);
};

// ✅ NEW: Root route handler
const rootHandler = (req, res) => {
    res.status(200).json({
        success: true,
        message: 'TikoSmart API Server is running! 🚀',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            auth: '/api/auth',
            // Thêm các endpoints chính khác nếu muốn
        },
    });
};

// ✅ NEW: Health check handler
const healthHandler = (req, res) => {
    res.status(200).json({
        status: 'OK',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
};

// ✅ Serve favicon file nếu có
const faviconHandler = (req, res) => {
    const faviconPath = path.join(__dirname, '../../public/favicon.ico');
    res.sendFile(faviconPath, (err) => {
        if (err) {
            res.status(204).end(); // Fallback to no content
        }
    });
};

module.exports = {
    notFound,
    errorHandler,
    rootHandler,
    healthHandler,
    faviconHandler,
};

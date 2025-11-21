const userRoutes = require('@routes/userRoutes');
const userStatusRoutes = require('@src/routes/userStatusRoutes');
const authRouter = require('@routes/authRoutes');
const departmentRoutes = require('@routes/departmentRoutes');
const prodCategoryRoutes = require('@routes/prodCategoryRoutes');
const productRoutes = require('@routes/productRoutes');
const inventoryLotRoutes = require('@routes/inventoryLotRoutes');
const supplierRoutes = require('@routes/supplierRoutes');
// const supplierTransactionRoutes = require('@routes/supTransactionRoutes');
// const supplierTransactionItemRoutes = require('@routes/supTransactionItemRoutes');
const supplierTransactionPaymentRoutes = require('@routes/supTransactionPaymentRoutes');
const supplierTransactionCombinedRoutes = require('@routes/supplierTransactionCombinedRoutes');
// const unitConversionRoutes = require('@routes/unitConversionRoutes');
const customerRoutes = require('@routes/customerRoutes');
const uploadRoutes = require('@routes/uploadRoutes');
const salesOrderRoutes = require('@src/routes/salesOrdersRoutes');
const salesInvoiceRoutes = require('@src/routes/SalesInvoicesRoutes');
const paymentRoutes = require('@src/routes/onlineBankingRoutes');
const orderReturnRoutes = require('@routes/orderReturnRoutes');
const paymentsCombinedRoutes = require('@src/routes/paymentsCombinedRoutes');
const deliveryRunsRoutes = require('@routes/deliveryRunsRoutes');
const deliveryRunOrdersRoutes = require('@routes/deliveryRunOrdersRoutes');
const taskRoutes = require('@routes/taskRoutes');
const dashboardRoutes = require('@routes/dashboardRoutes');
const codRemittanceTicketsRoutes = require('@routes/codRemittanceTicketsRoutes');
const notificationsRoutes = require('@routes/notificationsRoutes');
const excelRoutes = require('@src/routes/excelRoutes');
const issueRoutes = require('@src/routes/issueRoutes');

const {
    notFound,
    errorHandler,
    rootHandler,
    healthHandler,
    faviconHandler,
} = require('@middlewares/errorHandler');
const tokenUtils = require('@middlewares/jwt');

const initRoutes = (app) => {
    // Root and Health Check routes
    app.get('/', rootHandler);
    app.get('/health', healthHandler);
    app.get('/favicon.ico', faviconHandler);

    // API routes
    app.use('/api/auth', authRouter);
    app.use('/api/users', userRoutes);
    app.use('/api/users-status', userStatusRoutes);
    app.use('/api/departments', departmentRoutes);
    app.use('/api/product-categories', prodCategoryRoutes);
    app.use('/api/products', productRoutes);
    app.use('/api/inventory-lots', inventoryLotRoutes);
    app.use('/api/suppliers', supplierRoutes);
    app.use('/api/supplier-transactions-combined', supplierTransactionCombinedRoutes);
    app.use('/api/supplier-transaction-payments', supplierTransactionPaymentRoutes);
    // app.use('/api/unit-conversions', unitConversionRoutes);
    app.use('/api/customers', customerRoutes);
    app.use('/api/upload', uploadRoutes);
    app.use('/api/sales-orders', salesOrderRoutes);
    app.use('/api/sales-invoices', salesInvoiceRoutes);
    app.use('/api/payments', paymentRoutes);
    app.use('/api/order-returns', orderReturnRoutes);
    app.use('/api/payments-combined', paymentsCombinedRoutes);
    app.use('/api/delivery-runs', deliveryRunsRoutes);
    app.use('/api/delivery-run-orders', deliveryRunOrdersRoutes);
    app.use('/api/tasks', taskRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/cod-remittance-tickets', codRemittanceTicketsRoutes);
    app.use('/api/notifications', notificationsRoutes);
    app.use('/api/excel', excelRoutes);
    app.use('/api/issues', issueRoutes);

    // Error handling middlewares
    app.use(notFound);
    app.use(errorHandler);
};

module.exports = initRoutes;

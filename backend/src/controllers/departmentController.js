const asyncHandler = require('express-async-handler');
const Department = require('@src/models/Departments');

// [GET] /departments - Lấy danh sách departments (có tìm kiếm và phân trang) với tổng số phần tử (Antd Table)
const getDepartments = asyncHandler(async (req, res) => {
    const { q, limit, offset } = req.query;

    // Kiểm tra và xử lý tham số
    const parsedLimit = parseInt(limit) || 20;
    const parsedOffset = parseInt(offset) || 0;
    const maxLimit = 100;

    if (parsedLimit <= 0 || parsedOffset < 0) {
        return res.status(400).json({
            success: false,
            message: 'Giới hạn và vị trí phải là số không âm',
        });
    }

    const finalLimit = Math.min(parsedLimit, maxLimit);

    // Gọi listDepartments và countDepartments song song
    const [departments, total] = await Promise.all([
        Department.listDepartments({
            q: q ? q.trim() : undefined,
            limit: finalLimit,
            offset: parsedOffset,
        }),
        Department.countDepartments({ q: q ? q.trim() : undefined }),
    ]);

    res.status(200).json({
        success: true,
        data: departments,
        pagination: {
            total,
            limit: finalLimit,
            offset: parsedOffset,
        },
    });
});

// [POST] /departments - Tạo department mới
const createDepartment = asyncHandler(async (req, res) => {
    const { code, name, address } = req.body;

    if (!code || !name) {
        return res.status(400).json({
            success: false,
            message: 'Code và Name là bắt buộc!',
        });
    }

    const existingDepartment = await Department.findByCode(code);
    if (existingDepartment) {
        return res.status(400).json({
            success: false,
            message: 'Code đã tồn tại!',
        });
    }

    const newDepartment = await Department.createDepartment({ code, name, address });
    res.status(201).json({
        success: true,
        message: 'Tạo department thành công!',
        data: newDepartment,
    });
});

// [GET] /departments/:id - Lấy thông tin department theo ID
const getDepartmentById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const department = await Department.findById(id);
    if (!department) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy department!',
        });
    }

    res.status(200).json({
        success: true,
        data: department,
    });
});

// [GET] /departments/all - Lấy danh sách departments (có tìm kiếm, KHÔNG phân trang) (dành cho Select/Autocomplete)
const listDepartments = asyncHandler(async (req, res) => {
    const { q } = req.query;

    const departments = await Department.getAllDepartment({
        q: q ? q.trim() : undefined,
    });

    res.status(200).json({
        success: true,
        total: departments.length, // thêm tổng số record
        data: departments,
    });
});

// [PUT] /departments/:id - Cập nhật thông tin department
const updateDepartment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const payload = req.body;
    const { status } = req.body;

    // Kiểm tra department tồn tại
    const department = await Department.findById(id);
    if (!department) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy department' });
    }

    // Kiểm tra status nếu có
    if (status && !['active', 'disable'].includes(status)) {
        return res
            .status(400)
            .json({ success: false, message: 'Status phải là active hoặc disable' });
    }

    try {
        const updated = await Department.updateDepartment(id, payload);
        if (!updated || updated.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy department' });
        }

        return res.status(200).json({
            success: true,
            message: 'Cập nhật thành công',
            data: updated,
        });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ success: false, message: 'Mã code đã tồn tại' });
        }
        if (err.code === '23502') {
            return res.status(400).json({ success: false, message: 'Thiếu dữ liệu bắt buộc' });
        }
        return res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

// [DELETE] /departments/:id - Xóa department
const deleteDepartment = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const department = await Department.findById(id);
    if (!department) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy department để xóa!',
        });
    }

    try {
        await Department.deleteDepartment(id);
        res.status(200).json({
            success: true,
            message: 'Xóa department thành công!',
        });
    } catch (error) {
        if (error.code === '23503') {
            // PostgreSQL foreign key violation error code
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa department vì còn dữ liệu liên quan đến department này!',
            });
        }
        throw error; // Ném lỗi khác để middleware xử lý
    }
});

module.exports = {
    getDepartments,
    createDepartment,
    getDepartmentById,
    listDepartments,
    updateDepartment,
    deleteDepartment,
};

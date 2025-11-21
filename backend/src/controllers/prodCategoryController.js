const asyncHandler = require('express-async-handler');
const ProductCategory = require('@src/models/ProductCategories');

// [GET] /product-categories - Lấy danh sách product categories (có tìm kiếm và phân trang) với tổng số phần tử (Antd Table)
const getProductCategories = asyncHandler(async (req, res) => {
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

    // Gọi listProductCategories và countProductCategories song song
    const [categories, total] = await Promise.all([
        ProductCategory.listProductCategories({
            q: q ? q.trim() : undefined,
            limit: finalLimit,
            offset: parsedOffset,
        }),
        ProductCategory.countProductCategories({ q: q ? q.trim() : undefined }),
    ]);

    res.status(200).json({
        success: true,
        data: categories,
        pagination: {
            total,
            limit: finalLimit,
            offset: parsedOffset,
        },
    });
});

// [POST] /product-categories - Tạo product category mới
const createProductCategory = asyncHandler(async (req, res) => {
    const { name } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Tên danh mục là bắt buộc!',
        });
    }

    // Kiểm tra tên danh mục đã tồn tại chưa
    const existingCategory = await ProductCategory.findByName(name.trim());
    if (existingCategory) {
        return res.status(400).json({
            success: false,
            message: 'Tên danh mục đã tồn tại!',
        });
    }

    const newCategory = await ProductCategory.createProductCategory({ name: name.trim() });
    res.status(201).json({
        success: true,
        message: 'Tạo danh mục sản phẩm thành công!',
        data: newCategory,
    });
});

// [GET] /product-categories/:id - Lấy thông tin product category theo ID
const getProductCategoryById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const category = await ProductCategory.findById(id);
    if (!category) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy danh mục sản phẩm!',
        });
    }

    res.status(200).json({
        success: true,
        data: category,
    });
});

// [GET] /product-categories/all - Lấy danh sách product categories (dành cho Select/Autocomplete)
const listProductCategories = asyncHandler(async (req, res) => {
    const { q } = req.query;

    const categories = await ProductCategory.getAllProdCategory({
        q: q ? q.trim() : undefined,
    });

    res.status(200).json({
        success: true,
        total: categories.length, // thêm tổng số record
        data: categories,
    });
});

// [PUT] /product-categories/:id - Cập nhật thông tin product category
const updateProductCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    // Kiểm tra product category tồn tại
    const category = await ProductCategory.findById(id);
    if (!category) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy danh mục sản phẩm',
        });
    }

    // Kiểm tra name có được cung cấp và khác rỗng
    if (!name || !name.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Tên danh mục không được để trống',
        });
    }

    // Kiểm tra name có bị trùng với danh mục khác không
    if (name.trim() !== category.name) {
        const existingCategory = await ProductCategory.findByName(name.trim());
        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: 'Tên danh mục đã tồn tại',
            });
        }
    }

    try {
        const updated = await ProductCategory.updateProductCategory(id, { name: name.trim() });
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy danh mục sản phẩm',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Cập nhật danh mục sản phẩm thành công',
            data: updated,
        });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({
                success: false,
                message: 'Tên danh mục đã tồn tại',
            });
        }
        if (err.code === '23502') {
            return res.status(400).json({
                success: false,
                message: 'Thiếu dữ liệu bắt buộc',
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Lỗi server',
        });
    }
});

// [DELETE] /product-categories/:id - Xóa product category
const deleteProductCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const category = await ProductCategory.findById(id);
    if (!category) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy danh mục sản phẩm để xóa!',
        });
    }

    try {
        await ProductCategory.deleteProductCategory(id);
        res.status(200).json({
            success: true,
            message: 'Xóa danh mục sản phẩm thành công!',
        });
    } catch (error) {
        if (error.code === '23503') {
            // PostgreSQL foreign key violation error code
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa danh mục vì còn sản phẩm thuộc danh mục này!',
            });
        }
        throw error; // Ném lỗi khác để middleware xử lý
    }
});

module.exports = {
    getProductCategories,
    createProductCategory,
    getProductCategoryById,
    listProductCategories,
    updateProductCategory,
    deleteProductCategory,
};

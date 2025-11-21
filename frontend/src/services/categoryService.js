import apiClient from "./apiClient";

export const listCategories = (params = {}) => {
    const { q, limit = 10, offset = 0 } = params;
    return apiClient.get("/product-categories", {
        params: {
            q: q || undefined,
            limit: parseInt(limit),
            offset: parseInt(offset),
        },
    });
};
// Lấy list danh mục sản phẩm không phân trang
export const listAllCategories = () => {
    return apiClient.get("/product-categories/all");
}
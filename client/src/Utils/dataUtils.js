// 1. Chuyển danh sách phẳng (Flat) từ API thành Cây (Nested)
export const createCategoryList = (categories, parentId = null) => {
    const categoryList = [];
    let category;

    if (parentId == null) {
        category = categories.filter(cat => !cat.parentId);
    } else {
        category = categories.filter(cat => cat.parentId === parentId);
    }

    for (let cate of category) {
        categoryList.push({
            _id: cate._id,
            name: cate.name,
            slug: cate.slug,
            parentId: cate.parentId,
            children: createCategoryList(categories, cate._id)
        });
    }
    return categoryList;
};

// 2. Làm phẳng lại Cây để hiển thị lên Table (kèm thuộc tính level để thụt dòng)
export const flattenCategoriesForTable = (categories, level = 0, result = []) => {
    for (let cate of categories) {
        result.push({ ...cate, level }); // Thêm level để UI biết cần thụt vào bao nhiêu
        if (cate.children && cate.children.length > 0) {
            flattenCategoriesForTable(cate.children, level + 1, result);
        }
    }
    return result;
};
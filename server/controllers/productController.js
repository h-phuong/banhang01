const Product = require("../models/Product");
const Category = require("../models/Category");
const slugify = require("slugify");
const mongoose = require("mongoose");

require("../models/MasterData");

const Color = mongoose.model("Color");
const Size = mongoose.model("Size");

// =========================
// Helpers
// =========================

async function getDefaultColorSize() {
  let color = await Color.findOne({ name: "Default" });
  if (!color) {
    color = await Color.create({ name: "Default", hexCode: "#000000" });
  }

  let size = await Size.findOne({ name: "Default" });
  if (!size) {
    size = await Size.create({ name: "Default" });
  }

  return { colorId: color._id, sizeId: size._id };
}

function parseList(val, { upper = false } = {}) {
  if (!val) return [];

  if (Array.isArray(val)) {
    return val
      .map((x) => String(x || "").trim())
      .filter(Boolean)
      .map((x) => (upper ? x.toUpperCase() : x));
  }

  if (typeof val === "string") {
    const s = val.trim();
    if (!s) return [];

    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) {
        return parsed
          .map((x) => String(x || "").trim())
          .filter(Boolean)
          .map((x) => (upper ? x.toUpperCase() : x));
      }
    } catch (_) {}

    return s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => (upper ? x.toUpperCase() : x));
  }

  return [];
}

function parseImages(val) {
  if (!val) return [];

  if (Array.isArray(val)) {
    return val
      .map((it) => {
        if (typeof it === "string") {
          return { imageUrl: it.trim(), sortOrder: 0 };
        }

        if (it && typeof it === "object") {
          return {
            imageUrl: String(it.imageUrl || "").trim(),
            sortOrder: Number(it.sortOrder || 0),
          };
        }

        return null;
      })
      .filter((it) => it && it.imageUrl);
  }

  if (typeof val === "string") {
    const s = val.trim();
    if (!s) return [];

    try {
      const parsed = JSON.parse(s);
      return parseImages(parsed);
    } catch (_) {
      return s
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .map((url, idx) => ({
          imageUrl: url,
          sortOrder: idx,
        }));
    }
  }

  return [];
}

function normalizeThumbnail(val) {
  if (!val) return "";
  if (typeof val === "string") return val.trim();
  if (typeof val === "object" && val.imageUrl) {
    return String(val.imageUrl).trim();
  }
  return "";
}

async function resolveCategoryId(categoryId) {
  if (!categoryId) return null;

  if (mongoose.Types.ObjectId.isValid(categoryId)) {
    return categoryId;
  }

  const cat = await Category.findOne({
    $or: [
      { name: { $regex: `^${String(categoryId).trim()}$`, $options: "i" } },
      { slug: String(categoryId).trim() },
    ],
  });

  return cat ? cat._id : null;
}

async function buildVariantsFromColorSize(body) {
  const rawVariants = body.variants;

  if (rawVariants) {
    let parsedVariants = rawVariants;

    if (typeof rawVariants === "string") {
      try {
        parsedVariants = JSON.parse(rawVariants);
      } catch (_) {
        parsedVariants = [];
      }
    }

    if (!Array.isArray(parsedVariants)) parsedVariants = [];

    const { colorId: defaultColorId, sizeId: defaultSizeId } =
      await getDefaultColorSize();

    const variants = [];

    for (const v of parsedVariants) {
      const colorName = String(v?.color || v?.colorName || "").trim();
      const sizeName = String(v?.size || v?.sizeName || "")
        .trim()
        .toUpperCase();

      let colorId = v?.colorId || v?.color?._id || null;
      let sizeId = v?.sizeId || v?.size?._id || null;

      if (!colorId && colorName) {
        let color = await Color.findOne({ name: colorName });
        if (!color) {
          color = await Color.create({
            name: colorName,
            hexCode: v?.hexCode || "#000000",
          });
        }
        colorId = color._id;
      }

      if (!sizeId && sizeName) {
        let size = await Size.findOne({ name: sizeName });
        if (!size) {
          size = await Size.create({ name: sizeName });
        }
        sizeId = size._id;
      }

      variants.push({
        sku: String(v?.sku || "").trim(),
        quantity: Number(v?.quantity || 0),
        color: colorId || defaultColorId,
        size: sizeId || defaultSizeId,
      });
    }

    return variants;
  }

  const colors = parseList(body.colors);
  const sizes = parseList(body.sizes, { upper: true });
  const baseQty = Number(body.quantity || 0);
  const baseSku = String(body.sku || "").trim();

  const { colorId: defaultColorId, sizeId: defaultSizeId } =
    await getDefaultColorSize();

  if (!colors.length && !sizes.length) {
    return [
      {
        sku: baseSku || "",
        quantity: baseQty,
        color: defaultColorId,
        size: defaultSizeId,
      },
    ];
  }

  const colorDocs = [];
  for (const colorName of colors.length ? colors : ["Default"]) {
    let color = await Color.findOne({ name: colorName });
    if (!color) {
      color = await Color.create({
        name: colorName,
        hexCode: "#000000",
      });
    }
    colorDocs.push(color);
  }

  const sizeDocs = [];
  for (const sizeName of sizes.length ? sizes : ["Default"]) {
    let size = await Size.findOne({ name: sizeName });
    if (!size) {
      size = await Size.create({ name: sizeName });
    }
    sizeDocs.push(size);
  }

  const variants = [];

  for (const color of colorDocs) {
    for (const size of sizeDocs) {
      variants.push({
        sku:
          baseSku ||
          `${slugify(String(body.name || "SP"), {
            lower: false,
            strict: true,
          })}-${color.name}-${size.name}`,
        quantity: baseQty,
        color: color._id,
        size: size._id,
      });
    }
  }

  return variants;
}

function normalizeProductImages(product) {
  const obj = product.toObject ? product.toObject() : product;

  const thumbnail = normalizeThumbnail(obj.thumbnail);
  const images = parseImages(obj.images);

  const finalImages = [];

  if (thumbnail) {
    finalImages.push({
      imageUrl: thumbnail,
      sortOrder: 0,
      isPrimary: true,
    });
  }

  images.forEach((img, index) => {
    if (!finalImages.some((x) => x.imageUrl === img.imageUrl)) {
      finalImages.push({
        ...img,
        sortOrder:
          typeof img.sortOrder === "number"
            ? img.sortOrder
            : finalImages.length + index,
      });
    }
  });

  obj.thumbnail = thumbnail;
  obj.images = finalImages;

  return obj;
}

// =========================
// GET ALL PRODUCTS
// =========================
exports.getAllProducts = async (req, res) => {
  try {
    const {
      q,
      category,
      featured,
      bestSeller,
      isNew,
      minPrice,
      maxPrice,
      inStock,
      sort,
      page = 1,
      limit = 12,
    } = req.query;

    const filter = {};

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { slug: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { usageGuide: { $regex: q, $options: "i" } },
        { highlights: { $regex: q, $options: "i" } },
      ];
    }

    if (category) {
      if (mongoose.Types.ObjectId.isValid(category)) {
        filter.categoryId = category;
      } else {
        const cat = await Category.findOne({
          $or: [
            { name: { $regex: `^${category}$`, $options: "i" } },
            { slug: category },
          ],
        });
        if (cat) filter.categoryId = cat._id;
      }
    }

    if (String(featured) === "true") filter.isFeatured = true;
    if (String(bestSeller) === "true") filter.isBestSeller = true;
    if (String(isNew) === "true") filter.isNew = true;

    const docs = await Product.find(filter)
      .populate("categoryId", "name slug")
      .populate("variants.color", "name hexCode")
      .populate("variants.size", "name")
      .sort({ createdAt: -1 });

    let items = docs.map(normalizeProductImages);

    if (minPrice || maxPrice) {
      items = items.filter((p) => {
        const basePrice = Number(p.price || 0);

        if (minPrice && basePrice < Number(minPrice)) return false;
        if (maxPrice && basePrice > Number(maxPrice)) return false;
        return true;
      });
    }

    if (String(inStock) === "true") {
      items = items.filter((p) =>
        (p.variants || []).some((v) => Number(v.quantity || 0) > 0),
      );
    }

    if (sort === "price_asc") {
      items.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (sort === "price_desc") {
      items.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    } else if (sort === "name_asc") {
      items.sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || "")),
      );
    } else if (sort === "name_desc") {
      items.sort((a, b) =>
        String(b.name || "").localeCompare(String(a.name || "")),
      );
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const totalDocs = items.length;
    const start = (pageNum - 1) * limitNum;
    const pagedDocs = items.slice(start, start + limitNum);

    res.json({
      docs: pagedDocs,
      totalDocs,
      totalPages: Math.ceil(totalDocs / limitNum),
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    console.error("GET ALL PRODUCTS ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// =========================
// GET PRODUCT BY ID
// =========================
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const product = await Product.findById(id)
      .populate("categoryId", "name slug")
      .populate("variants.color", "name hexCode")
      .populate("variants.size", "name");

    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }

    res.json(normalizeProductImages(product));
  } catch (error) {
    console.error("GET PRODUCT BY ID ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// =========================
// CREATE PRODUCT
// =========================
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      usageGuide,
      highlights,
      categoryId,
      isFeatured,
      isBestSeller,
      isNew,
      thumbnail,
      images,
      price,
      oldPrice,
      promotionalPrice,
      quantity,
      status,
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Tên sản phẩm là bắt buộc" });
    }

    if (!categoryId) {
      return res.status(400).json({ message: "Danh mục là bắt buộc" });
    }

    const finalCategoryId = await resolveCategoryId(categoryId);

    if (!finalCategoryId) {
      return res.status(400).json({ message: "Danh mục không hợp lệ" });
    }

    const baseSlug = slugify(String(name), { lower: true, strict: true });
    let finalSlug = baseSlug || `product-${Date.now()}`;
    let slugExists = await Product.findOne({ slug: finalSlug });
    let i = 1;

    while (slugExists) {
      finalSlug = `${baseSlug}-${i++}`;
      slugExists = await Product.findOne({ slug: finalSlug });
    }

    const variants = await buildVariantsFromColorSize({
      ...req.body,
      quantity,
    });

    const product = await Product.create({
      name: String(name).trim(),
      slug: finalSlug,
      description: String(description || "").trim(),
      usageGuide: String(usageGuide || "").trim(),
      highlights: String(highlights || "").trim(),
      categoryId: finalCategoryId,
      thumbnail: normalizeThumbnail(thumbnail),
      images: parseImages(images),
      price: Number(price || 0),
      oldPrice: Number(oldPrice || 0),
      promotionalPrice:
        promotionalPrice === null ||
        promotionalPrice === "" ||
        typeof promotionalPrice === "undefined"
          ? null
          : Number(promotionalPrice),
      status: String(status || "ACTIVE").toUpperCase(),
      isFeatured: String(isFeatured) === "true" || isFeatured === true,
      isBestSeller: String(isBestSeller) === "true" || isBestSeller === true,
      isNew: String(isNew) === "true" || isNew === true,
      variants,
    });

    const created = await Product.findById(product._id)
      .populate("categoryId", "name slug")
      .populate("variants.color", "name hexCode")
      .populate("variants.size", "name");

    res.status(201).json(normalizeProductImages(created));
  } catch (error) {
    console.error("CREATE PRODUCT ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// =========================
// UPDATE PRODUCT
// =========================
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const existing = await Product.findById(id);
    if (!existing) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }

    const payload = { ...req.body };

    if (payload.name && String(payload.name).trim() !== existing.name) {
      const baseSlug = slugify(String(payload.name), {
        lower: true,
        strict: true,
      });
      let finalSlug = baseSlug || `product-${Date.now()}`;
      let slugExists = await Product.findOne({
        slug: finalSlug,
        _id: { $ne: id },
      });
      let i = 1;

      while (slugExists) {
        finalSlug = `${baseSlug}-${i++}`;
        slugExists = await Product.findOne({
          slug: finalSlug,
          _id: { $ne: id },
        });
      }

      payload.slug = finalSlug;
    }

    if ("name" in payload) payload.name = String(payload.name || "").trim();
    if ("description" in payload) {
      payload.description = String(payload.description || "").trim();
    }
    if ("usageGuide" in payload) {
      payload.usageGuide = String(payload.usageGuide || "").trim();
    }
    if ("highlights" in payload) {
      payload.highlights = String(payload.highlights || "").trim();
    }

    if ("price" in payload) payload.price = Number(payload.price || 0);
    if ("oldPrice" in payload) payload.oldPrice = Number(payload.oldPrice || 0);
    if ("promotionalPrice" in payload) {
      payload.promotionalPrice =
        payload.promotionalPrice === null ||
        payload.promotionalPrice === "" ||
        typeof payload.promotionalPrice === "undefined"
          ? null
          : Number(payload.promotionalPrice);
    }

    if ("categoryId" in payload) {
      if (!payload.categoryId) {
        return res.status(400).json({ message: "Danh mục là bắt buộc" });
      }

      const finalCategoryId = await resolveCategoryId(payload.categoryId);

      if (!finalCategoryId) {
        return res.status(400).json({ message: "Danh mục không hợp lệ" });
      }

      payload.categoryId = finalCategoryId;
    }

    if ("thumbnail" in payload) {
      payload.thumbnail = normalizeThumbnail(payload.thumbnail);
    }
    if ("images" in payload) payload.images = parseImages(payload.images);
    if ("status" in payload) {
      payload.status = String(payload.status || "ACTIVE").toUpperCase();
    }

    if ("isFeatured" in payload) {
      payload.isFeatured =
        String(payload.isFeatured) === "true" || payload.isFeatured === true;
    }

    if ("isBestSeller" in payload) {
      payload.isBestSeller =
        String(payload.isBestSeller) === "true" ||
        payload.isBestSeller === true;
    }

    if ("isNew" in payload) {
      payload.isNew =
        String(payload.isNew) === "true" || payload.isNew === true;
    }

    if ("variants" in payload || "colors" in payload || "sizes" in payload) {
      const variantSource = {
        ...existing.toObject(),
        ...req.body,
      };

      if (!("variants" in req.body)) {
        delete variantSource.variants;
      }

      payload.variants = await buildVariantsFromColorSize(variantSource);
    }

    delete payload.quantity;
    delete payload.sku;
    delete payload.shortDescription;
    delete payload.brand;
    delete payload.material;
    delete payload.careInstructions;
    delete payload.tags;

    const updated = await Product.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    })
      .populate("categoryId", "name slug")
      .populate("variants.color", "name hexCode")
      .populate("variants.size", "name");

    res.json(normalizeProductImages(updated));
  } catch (error) {
    console.error("UPDATE PRODUCT ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// =========================
// DELETE PRODUCT
// =========================
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const deleted = await Product.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }

    res.json({ message: "Xóa sản phẩm thành công" });
  } catch (error) {
    console.error("DELETE PRODUCT ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// =========================
// BEST SELLERS
// =========================
exports.getBestSellers = async (req, res) => {
  try {
    const docs = await Product.find({ isBestSeller: true })
      .populate("categoryId", "name slug")
      .populate("variants.color", "name hexCode")
      .populate("variants.size", "name")
      .sort({ createdAt: -1 })
      .limit(12);

    res.json({ docs: docs.map(normalizeProductImages) });
  } catch (error) {
    console.error("GET BEST SELLERS ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// =========================
// SEARCH PRODUCTS
// =========================
exports.searchProducts = async (req, res) => {
  try {
    const q = String(req.query.q || req.query.search || "").trim();

    const query = q
      ? {
          $or: [
            { name: { $regex: q, $options: "i" } },
            { slug: { $regex: q, $options: "i" } },
            { description: { $regex: q, $options: "i" } },
            { usageGuide: { $regex: q, $options: "i" } },
            { highlights: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    const docs = await Product.find(query)
      .populate("categoryId", "name slug")
      .populate("variants.color", "name hexCode")
      .populate("variants.size", "name")
      .sort({ createdAt: -1 });

    res.json({ docs: docs.map(normalizeProductImages) });
  } catch (error) {
    console.error("SEARCH PRODUCTS ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// =========================
// GET PRODUCT BY SLUG
// =========================
exports.getProductBySlug = async (req, res) => {
  try {
    const slug = String(req.params.slug || "").trim();

    const product = await Product.findOne({ slug })
      .populate("categoryId", "name slug")
      .populate("variants.color", "name hexCode")
      .populate("variants.size", "name");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(normalizeProductImages(product));
  } catch (error) {
    console.error("GET PRODUCT BY SLUG ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// =========================
// RELATED PRODUCTS
// =========================
exports.getRelatedProducts = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const docs = await Product.find({
      _id: { $ne: product._id },
      categoryId: product.categoryId,
    })
      .populate("categoryId", "name slug")
      .populate("variants.color", "name hexCode")
      .populate("variants.size", "name")
      .sort({ createdAt: -1 })
      .limit(8);

    res.json({ docs: docs.map(normalizeProductImages) });
  } catch (error) {
    console.error("GET RELATED PRODUCTS ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// =========================
// GET PRODUCT BY VARIANT ID
// =========================
exports.getProductByVariantId = async (req, res) => {
  try {
    const { variantId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(variantId)) {
      return res.status(400).json({ message: "Invalid variant id" });
    }

    const product = await Product.findOne({ "variants._id": variantId })
      .populate("categoryId", "name slug")
      .populate("variants.color", "name hexCode")
      .populate("variants.size", "name");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const normalized = normalizeProductImages(product);
    const variant =
      (normalized.variants || []).find(
        (v) => String(v._id) === String(variantId),
      ) || null;

    res.json({
      product: normalized,
      variant,
    });
  } catch (error) {
    console.error("GET PRODUCT BY VARIANT ID ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

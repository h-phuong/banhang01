const express = require("express");
const router = express.Router();
const Product = require("../models/Product");

let Coupon;
try {
  Coupon = require("../models/Coupon");
} catch (err) {
  Coupon = null;
}

/* =========================
GET PRODUCT IMAGE
========================= */

function getProductImage(p) {
  if (p.thumbnail) {
    if (p.thumbnail.startsWith("http")) return p.thumbnail;
    return `http://localhost:5000${p.thumbnail}`;
  }

  if (p.images && p.images.length) {
    const img = p.images[0];

    if (img.startsWith("http")) return img;

    return `http://localhost:5000${img}`;
  }

  return "https://via.placeholder.com/300";
}

function getCouponBanner(coupon) {
  if (!coupon?.banner) return null;
  if (coupon.banner.startsWith("http")) return coupon.banner;
  return `http://localhost:5000${coupon.banner}`;
}

/* =========================
SIZE CHART
========================= */

const sizeChart = [
  { size: "S", height: [150, 160], weight: [45, 53] },
  { size: "M", height: [160, 167], weight: [54, 60] },
  { size: "L", height: [167, 175], weight: [61, 70] },
  { size: "XL", height: [175, 180], weight: [71, 80] },
  { size: "XXL", height: [180, 210], weight: [81, 200] },
];

function calculateSize(height, weight, fit = "regular") {
  let size = "L";

  sizeChart.forEach((row) => {
    if (
      height >= row.height[0] &&
      height <= row.height[1] &&
      weight >= row.weight[0] &&
      weight <= row.weight[1]
    ) {
      size = row.size;
    }
  });

  const order = ["S", "M", "L", "XL", "XXL"];

  let index = order.indexOf(size);

  if (fit === "oversize") index++;
  if (fit === "slim") index--;

  index = Math.max(0, Math.min(order.length - 1, index));

  return order[index];
}

/* =========================
COLOR ADVICE
========================= */

function colorAdvice(msg) {
  if (msg.includes("da ngăm")) {
    return `Da ngăm hợp màu:

🔥 Cam đất
🔥 Nâu
🔥 Rêu
🔥 Đỏ đô

Tránh:
❌ Xanh lơ
❌ Hồng neon`;
  }

  if (msg.includes("da trắng")) {
    return `Da trắng rất dễ phối đồ:

✔ Navy
✔ Đỏ rượu
✔ Pastel
✔ Đen`;
  }

  return null;
}

/* =========================
COLOR THEORY
========================= */

function colorTheory(msg) {
  if (msg.includes("phối màu") || msg.includes("mix màu")) {
    return `🎨 Công thức phối màu:

1️⃣ Monochromatic
Áo đen + quần xám + giày đen

2️⃣ Complementary
Áo cam + quần xanh

3️⃣ Analogous
Xanh lá + vàng + be

4️⃣ Neutral + 1
Trắng / đen / xám + 1 màu nổi`;
  }

  return null;
}

/* =========================
STYLE ADVICE
========================= */

function styleAdvice(msg) {
  if (msg.includes("party") || msg.includes("tiệc")) {
    return `Set đồ đi tiệc:

🔥 Hoodie + quần cargo
🔥 Jacket + quần đen slim
🔥 Tee oversize + jean rách

Mix thêm:
👟 Sneaker trắng
🧢 Nón lưỡi trai`;
  }

  if (msg.includes("đi chơi") || msg.includes("cafe")) {
    return `Outfit đi chơi:

👕 Tee oversize
👖 Quần jean
👟 Sneaker trắng

Phong cách streetwear`;
  }

  if (msg.includes("đi làm")) {
    return `Outfit đi làm:

👕 Áo polo
👖 Quần khaki
👟 Sneaker trắng

Phong cách smart casual`;
  }

  return null;
}

/* =========================
COUPON LOGIC
========================= */

function isCouponValid(coupon) {
  if (!coupon) return false;
  if (coupon.isActive === false) return false;

  const now = new Date();

  if (coupon.startDate && new Date(coupon.startDate) > now) return false;
  if (coupon.endDate && new Date(coupon.endDate) < now) return false;
  if (typeof coupon.limit === "number" && coupon.limit <= 0) return false;

  return true;
}

function formatCoupon(coupon) {
  if (!coupon) return null;

  return {
    name: coupon.name,
    code: coupon.code,
    discountPercent: coupon.discountPercent || 0,
    minOrderValue: coupon.minOrderValue || 0,
    banner: getCouponBanner(coupon),
    startDate: coupon.startDate,
    endDate: coupon.endDate,
  };
}

async function getBestCoupon() {
  if (!Coupon) return null;

  try {
    const coupons = await Coupon.find({ isActive: true }).lean();

    if (!coupons.length) return null;

    const validCoupons = coupons.filter(isCouponValid);

    if (!validCoupons.length) return null;

    validCoupons.sort((a, b) => {
      if ((b.discountPercent || 0) !== (a.discountPercent || 0)) {
        return (b.discountPercent || 0) - (a.discountPercent || 0);
      }

      return (a.minOrderValue || 0) - (b.minOrderValue || 0);
    });

    return formatCoupon(validCoupons[0]);
  } catch (err) {
    console.log("COUPON ERROR:", err);
    return null;
  }
}

function applyCouponToPrice(price, coupon) {
  if (!coupon) return price;
  if (price < (coupon.minOrderValue || 0)) return price;

  const discount = Math.floor((price * (coupon.discountPercent || 0)) / 100);
  return Math.max(0, price - discount);
}

/* =========================
MAIN ROUTE
========================= */

router.post("/", async (req, res) => {
  try {
    const message = req.body.message;

    /* =========================
WELCOME
========================= */

    if (!message) {
      const products = await Product.find({ isActive: true }).limit(4);
      const coupon = await getBestCoupon();

      const result = products.map((p) => ({
        name: p.name,
        price: p.price,
        image: getProductImage(p),
        link: `http://localhost:3000/product/${p._id}`,
      }));

      return res.json({
        reply: `Xin chào 👋

Mình là AI Stylist của shop.

Bạn có thể hỏi:

👕 áo đen size M
📏 1m70 65kg mặc size gì
🎨 da ngăm mặc màu gì
💃 đồ đi party
💰 áo rẻ nhất
🎁 mã giảm giá hôm nay`,
        products: result,
        coupon: coupon || null,
      });
    }

    /* =========================
NORMALIZE MESSAGE
========================= */

    const msg = message.toLowerCase();

    /* =========================
RETURN POLICY
========================= */

    if (
      msg.includes("đổi trả") ||
      msg.includes("chính sách đổi trả") ||
      msg.includes("đổi hàng") ||
      msg.includes("trả hàng") ||
      msg.includes("hoàn hàng") ||
      msg.includes("refund")
    ) {
      return res.json({
        reply: `Shop hỗ trợ đổi trả trong vòng 7 ngày kể từ khi nhận hàng.

Điều kiện đổi trả:
- Sản phẩm còn nguyên vẹn, chưa qua sử dụng
- Có hóa đơn mua hàng
`,
        link: "http://localhost:3000/policy/return",
      });
    }

    /* =========================
COUPON QUESTION
========================= */

    /* =========================
COUPON QUESTION
========================= */

    if (
      msg.includes("mã giảm giá") ||
      msg.includes("coupon") ||
      msg.includes("voucher") ||
      msg.includes("sale") ||
      msg.includes("khuyến mãi")
    ) {
      const coupon = await getBestCoupon();

      if (!coupon) {
        return res.json({
          reply: "Hiện tại shop chưa có mã giảm giá nào đang hoạt động 😢",
        });
      }

      return res.json({
        reply: `🎁 Mã giảm giá hiện có:

Tên: ${coupon.name}
Code: ${coupon.code}
Giảm: ${coupon.discountPercent}%
Đơn tối thiểu: ${Number(coupon.minOrderValue).toLocaleString("vi-VN")}đ`,
        coupon,
      });
    }

    /* =========================
STYLE
========================= */

    const style = styleAdvice(msg);
    if (style) return res.json({ reply: style });

    /* =========================
COLOR
========================= */

    const color = colorAdvice(msg);
    if (color) return res.json({ reply: color });

    /* =========================
COLOR THEORY
========================= */

    const theory = colorTheory(msg);
    if (theory) return res.json({ reply: theory });

    /* =========================
SIZE
========================= */

    if (msg.includes("kg") && msg.includes("m")) {
      const h = msg.match(/1m(\d+)/);
      const w = msg.match(/(\d+)kg/);

      if (h && w) {
        const height = parseInt(h[1]) + 100;
        const weight = parseInt(w[1]);

        let fit = "regular";

        if (msg.includes("oversize")) fit = "oversize";
        if (msg.includes("ôm")) fit = "slim";

        const size = calculateSize(height, weight, fit);

        return res.json({
          reply: `Với ${height}cm ${weight}kg

👕 Size phù hợp: ${size}`,
        });
      }
    }

    /* =========================
PRICE LOGIC
========================= */

    let query = { isActive: true };
    let sort = {};
    let limit = 5;

    /* product type */

    if (msg.includes("áo")) {
      query.name = { $regex: "áo|tee|shirt", $options: "i" };
    }

    if (msg.includes("quần")) {
      query.name = { $regex: "quần|pant|jean", $options: "i" };
    }

    if (msg.includes("hoodie")) {
      query.name = { $regex: "hoodie", $options: "i" };
    }

    /* color */

    if (msg.includes("đen")) {
      query["variants.color"] = { $regex: "đen", $options: "i" };
    }

    if (msg.includes("trắng")) {
      query["variants.color"] = { $regex: "trắng", $options: "i" };
    }

    /* size */

    const sizeMatch = msg.match(/size\s*(s|m|l|xl|xxl)/i);
    if (sizeMatch) query["variants.size"] = sizeMatch[1].toUpperCase();

    /* price under */

    const underPrice = msg.match(/(dưới|<)\s*(\d+)/);
    if (underPrice) {
      query.price = { $lte: parseInt(underPrice[2]) * 1000 };
    }

    /* cheapest */

    if (msg.includes("rẻ nhất")) {
      sort.price = 1;
      limit = 3;
    }

    /* most expensive */

    if (msg.includes("đắt nhất") || msg.includes("mắc nhất")) {
      sort.price = -1;
      limit = 3;
    }

    /* search products */

    const products = await Product.find(query).sort(sort).limit(limit);
    const coupon = await getBestCoupon();

    if (!products.length) {
      const random = await Product.find({ isActive: true }).limit(3);

      const result = random.map((p) => ({
        name: p.name,
        price: p.price,
        image: getProductImage(p),
      }));

      return res.json({
        reply: "Shop chưa tìm thấy mẫu phù hợp 😢 nhưng có vài mẫu hot 🔥",
        products: result,
        coupon: coupon || null,
      });
    }

    /* format result */

    const result = products.map((p) => {
      const finalPrice = coupon ? applyCouponToPrice(p.price, coupon) : p.price;

      return {
        name: p.name,
        price: p.price,
        finalPrice,
        image: getProductImage(p),
        sizes: p.variants ? [...new Set(p.variants.map((v) => v.size))] : [],
      };
    });

    return res.json({
      reply: `Shop tìm được ${result.length} sản phẩm 👕${
        coupon
          ? `\n🎁 Mã giảm giá: ${coupon.code} - giảm ${coupon.discountPercent}%`
          : ""
      }`,
      products: result,
      coupon: coupon || null,
    });
  } catch (err) {
    console.log("CHAT ERROR:", err);

    res.status(500).json({
      reply: "Server bị lỗi 😢",
    });
  }
});

module.exports = router;

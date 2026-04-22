// Cloudinary configuration and upload service
// You need to set up Cloudinary first:
// 1. Create account at https://cloudinary.com
// 2. Get your Cloud Name from dashboard
// 3. Create an Upload Preset (Settings → Upload → Add unsigned code)
// 4. Update CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET below

const CLOUDINARY_CLOUD_NAME = "dafxztvpj"; // Your cloud name
const CLOUDINARY_UPLOAD_PRESET = "haidilao"; // Your upload preset

export const uploadToCloudinary = async (file) => {
  try {
    // Validate file
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      throw new Error("Chỉ hỗ trợ ảnh JPG, PNG, WEBP!");
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Kích thước ảnh không được vượt quá 5MB!");
    }

    // Create FormData for Cloudinary
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("cloud_name", CLOUDINARY_CLOUD_NAME);

    // Upload to Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Upload thất bại!");
    }

    const data = await response.json();

    // Return Cloudinary URL
    return {
      url: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
      size: data.bytes,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw error;
  }
};

export const deleteFromCloudinary = async (publicId) => {
  try {
    // Note: Deleting requires a signed request with API key
    // For now, you'll need to handle deletion on the server side
    console.log("To delete from Cloudinary, use server-side deletion with API key");
    // Implement on server: https://cloudinary.com/documentation/admin_api#delete_resources
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    throw error;
  }
};

export const getCloudinaryUrl = (publicId, options = {}) => {
  // Generate optimized Cloudinary URL with transformations
  const {
    width = null,
    height = null,
    crop = "fill",
    quality = "auto",
    format = "auto",
  } = options;

  let url = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload`;

  // Add transformations
  const transforms = [];
  if (width || height) {
    transforms.push(`w_${width || "auto"}`);
    transforms.push(`h_${height || "auto"}`);
    transforms.push(`c_${crop}`);
  }
  transforms.push(`q_${quality}`);
  transforms.push(`f_${format}`);

  if (transforms.length > 0) {
    url += `/${transforms.join(",")}`;
  }

  url += `/${publicId}`;
  return url;
};

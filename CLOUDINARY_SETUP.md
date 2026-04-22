# Cloudinary Setup Guide

This guide will help you set up Cloudinary for image uploads instead of saving to localhost.

## What is Cloudinary?

Cloudinary is a cloud-based image and video management service. It provides:
- Automatic image optimization
- CDN delivery (fast worldwide access)
- Image transformation capabilities
- Secure storage
- Free tier with generous limits

## Step 1: Create a Cloudinary Account

1. Go to [https://cloudinary.com](https://cloudinary.com)
2. Click "Sign up for free"
3. Create an account with your email
4. Verify your email address
5. Complete your profile setup

## Step 2: Get Your Cloud Name

1. Log in to your Cloudinary Dashboard
2. You'll see your "Cloud Name" at the top of the page
3. This is usually something like: `dxyzabc123` (yours will be different)
4. Copy this value

## Step 3: Create an Upload Preset

1. In Cloudinary Dashboard, go to **Settings → Upload**
2. Scroll down to "Upload presets"
3. Click "Add upload preset"
4. Fill in the form:
   - **Name**: Something like `my_web_uploads`
   - **Signing Mode**: Select "Unsigned"
5. Click "Save"

The "Unsigned" mode allows client-side uploads without exposing your API secret.

## Step 4: Update Your Server Environment

Open this file: `server/.env`

Replace these placeholders with your actual values:

```env
CLOUDINARY_CLOUD_NAME=YOUR_CLOUD_NAME
CLOUDINARY_API_KEY=YOUR_API_KEY
CLOUDINARY_API_SECRET=YOUR_API_SECRET
```

You can find these values in your Cloudinary Dashboard under **Account Details** → **API Keys**.

Example:
```javascript
const CLOUDINARY_CLOUD_NAME = "dxyzabc123";
const CLOUDINARY_UPLOAD_PRESET = "my_web_uploads";
```

## Step 5: Test the Upload

1. Start your server: `npm run dev` in the `server` folder
2. Upload an image through your app's upload feature
3. The image should upload to Cloudinary (not localhost)
4. The image URL should start with `https://res.cloudinary.com/`

## Step 6: Migrate Existing Images

If you have existing images in `server/uploads/`, run the migration script:

```bash
cd server
npm run migrate-images
```

This will upload all local images to Cloudinary and update the database.

## Where Images are Uploaded

Your images will now be uploaded to:
```
https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/...
```

These URLs are permanent and work worldwide through Cloudinary's CDN.

## Locations to Check

Images are being used in these files:
- Product images: `AdminUploadImages.jsx`
- User avatars: `ImageUploadInput.jsx`
- Profile pictures: Various profile pages
- Any image upload forms

## Features Enabled by Cloudinary

With this setup, you can:

1. **Automatic Image Optimization**: Images are automatically optimized for web
2. **Responsive Images**: Generate different sizes for different devices
3. **Image Transformations**:
   - Resize: `?w=300&h=300&c=fill`
   - Quality: `?q=auto&f=auto`
   - Format: Automatically serves best format (WebP for modern browsers)

Example optimized URL:
```javascript
// Original
https://res.cloudinary.com/dxyzabc123/image/upload/v1234567890/sample.jpg

// With transformations
https://res.cloudinary.com/dxyzabc123/image/upload/w_300,h_300,c_fill,q_auto,f_auto/v1234567890/sample.jpg
```

## Cloudinary Free Tier Limits

- **Storage**: Up to 25 GB
- **Bandwidth**: Up to 25 GB/month
- **Monthly transformations**: Unlimited

This is more than enough for a small to medium e-commerce site.

## Future Enhancements

For complete management, you can:

1. **Server-side deletion**: Implement on backend to delete from Cloudinary
2. **Image library**: Show all Cloudinary images in admin panel
3. **Image metadata**: Track image dimensions, file size, etc.
4. **Webhooks**: Get notified when images are uploaded

## Troubleshooting

### "Upload thất bại" (Upload failed)

1. Check that `CLOUDINARY_CLOUD_NAME` is correct
2. Check that `CLOUDINARY_UPLOAD_PRESET` exists and is set to "Unsigned"
3. Check browser console for detailed error messages
4. Make sure file size is under 5MB

### Image appears broken

1. Log in to Cloudinary and check if image exists
2. Try accessing the URL directly in browser
3. Ensure the URL starts with `https://res.cloudinary.com/`

### Want to delete all test uploads?

1. Go to Cloudinary Media Library
2. Delete images manually from the browser
3. Or delete them via the API (requires API key on server)

## Cost

Cloudinary's free tier should cover most needs. If you need more:
- Pay-as-you-go plans start at very affordable rates
- No setup or monthly fees required

## Additional Resources

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [JavaScript SDK](https://cloudinary.com/documentation/javascript_integration)
- [Image Transformations](https://cloudinary.com/documentation/image_transformation_reference)

## Contact Support

If you need help:
1. Check your Cloudinary account for support options
2. Review the error messages in browser console
3. Cloudinary has excellent documentation for most issues

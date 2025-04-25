// utils/imageProcessor.js
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

module.exports = {
  /**
   * Process and optimize product images
   * @param {Array} images - Array of image objects or strings
   * @returns {Promise<Array>} - Processed image objects
   */
  async processImages(images) {
    if (!images || !Array.isArray(images)) return [];

    const processedImages = [];

    for (const img of images) {
      try {
        // Handle both URL strings and file objects
        const isUrl = typeof img === 'string' || (img.url && typeof img.url === 'string');
        const imageUrl = isUrl ? (typeof img === 'string' ? img : img.url) : null;

        if (imageUrl) {
          // If it's already a URL (from previous processing or external source)
          if (imageUrl.startsWith('http') || imageUrl.startsWith('/')) {
            processedImages.push({
              url: imageUrl,
              thumbnail: this.generateThumbnailUrl(imageUrl),
              alt: img.alt || 'Product image',
              metadata: img.metadata || {}
            });
            continue;
          }
        }

        // Process new image uploads (Base64 or file buffer)
        if (img.buffer || img.base64) {
          const processed = await this.processAndSaveImage(img);
          processedImages.push(processed);
        } else if (imageUrl) {
          // Local file path (from multer upload)
          const processed = await this.processLocalImage(imageUrl, img);
          processedImages.push(processed);
        }
      } catch (error) {
        console.error('Error processing image:', error);
        // Fallback to original image if processing fails
        if (img.url) {
          processedImages.push({
            url: img.url,
            thumbnail: img.thumbnail || img.url,
            alt: img.alt || 'Product image',
            metadata: img.metadata || {}
          });
        }
      }
    }

    return processedImages;
  },

  /**
   * Process and save a new image (from buffer or base64)
   */
  async processAndSaveImage(image) {
    const imageBuffer = image.buffer || Buffer.from(image.base64, 'base64');
    const filename = `${uuidv4()}.webp`;
    const filepath = path.join(uploadDir, filename);
    const publicUrl = `/uploads/${filename}`;

    // Process image with sharp
    await sharp(imageBuffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(filepath);

    // Create thumbnail
    const thumbnailUrl = await this.createThumbnail(imageBuffer);

    return {
      url: publicUrl,
      thumbnail: thumbnailUrl,
      alt: image.alt || 'Product image',
      metadata: {
        size: imageBuffer.length,
        width: 1200,
        height: 1200,
        format: 'webp',
        ...(image.metadata || {})
      }
    };
  },

  /**
   * Process locally uploaded image (from multer)
   */
  async processLocalImage(imagePath, imageData) {
    const filename = `${uuidv4()}.webp`;
    const filepath = path.join(uploadDir, filename);
    const publicUrl = `/uploads/${filename}`;

    // Process image with sharp
    await sharp(imagePath)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(filepath);

    // Create thumbnail
    const thumbnailUrl = await this.createThumbnail(imagePath);

    // Delete the original uploaded file
    try {
      fs.unlinkSync(imagePath);
    } catch (err) {
      console.error('Error deleting temp upload file:', err);
    }

    return {
      url: publicUrl,
      thumbnail: thumbnailUrl,
      alt: imageData.alt || 'Product image',
      metadata: {
        originalName: imageData.originalname,
        size: imageData.size,
        width: 1200,
        height: 1200,
        format: 'webp',
        ...(imageData.metadata || {})
      }
    };
  },

  /**
   * Create thumbnail version of an image
   */
  async createThumbnail(imageInput) {
    const thumbFilename = `thumb-${uuidv4()}.webp`;
    const thumbPath = path.join(uploadDir, thumbFilename);
    const publicUrl = `/uploads/${thumbFilename}`;

    await sharp(imageInput)
      .resize(300, 300, { fit: 'cover' })
      .webp({ quality: 70 })
      .toFile(thumbPath);

    return publicUrl;
  },

  /**
   * Generate thumbnail URL from main image URL
   */
  generateThumbnailUrl(imageUrl) {
    if (!imageUrl) return null;
    if (imageUrl.includes('res.cloudinary.com')) {
      return imageUrl.replace('/upload/', '/upload/c_thumb,g_center,w_300/');
    }
    return imageUrl.replace(/(\.\w+)$/, '-thumb$1');
  },

  /**
   * Delete image files from storage
   */
  async deleteImages(imageUrls) {
    if (!Array.isArray(imageUrls)) return;

    for (const url of imageUrls) {
      try {
        if (url && typeof url === 'string') {
          const filename = path.basename(url);
          const filepath = path.join(uploadDir, filename);
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
          }

          // Also delete thumbnail if exists
          const thumbUrl = this.generateThumbnailUrl(url);
          if (thumbUrl && thumbUrl !== url) {
            const thumbFilename = path.basename(thumbUrl);
            const thumbPath = path.join(uploadDir, thumbFilename);
            if (fs.existsSync(thumbPath)) {
              fs.unlinkSync(thumbPath);
            }
          }
        }
      } catch (error) {
        console.error('Error deleting image file:', url, error);
      }
    }
  }
};
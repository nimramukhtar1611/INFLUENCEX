// services/uploadService.js - CONSISTENT FILE UPLOAD SERVICE WITH LOCAL FALLBACK
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

class UploadService {
  constructor() {
    // Ensure environment is loaded
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      console.log('🔍 Loading environment variables...');
      const path = require('path');
      require('dotenv').config({ path: path.join(__dirname, '../.env') });
    }
    
    this.initCloudinary();
    this.initMulter();
  }

  initCloudinary() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });
    
    console.log('🔍 Cloudinary configured with:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? '✅' : '❌',
      api_key: process.env.CLOUDINARY_API_KEY ? '✅' : '❌',
      api_secret: process.env.CLOUDINARY_API_SECRET ? '✅' : '❌'
    });
  }

  initMulter() {
    // Try Cloudinary storage first, fallback to local storage
    if (this.isCloudinaryConfigured()) {
      this.initCloudinaryStorage();
    } else {
      this.initLocalStorage();
    }
  }

  isCloudinaryConfigured() {
    const configured = !!(process.env.CLOUDINARY_CLOUD_NAME && 
           process.env.CLOUDINARY_API_KEY && 
           process.env.CLOUDINARY_API_SECRET);
    
    console.log('🔍 Cloudinary config check:', {
      hasCloudName: !!process.env.CLOUDINARY_CLOUD_NAME,
      hasApiKey: !!process.env.CLOUDINARY_API_KEY,
      hasApiSecret: !!process.env.CLOUDINARY_API_SECRET,
      configured: configured
    });
    
    return configured;
  }

  initCloudinaryStorage() {
    try {
      console.log('🔍 Initializing Cloudinary storage...');
      
      // Configure Cloudinary storage
      const storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
          folder: (req, file) => {
            const folderMap = {
              'brand': 'brands',
              'creator': 'creators', 
              'campaign': 'campaigns',
              'deal': 'deals',
              'message': 'messages',
              'profile': 'profiles'
            };
            const type = req.body.type || 'general';
            return folderMap[type] || 'uploads';
          },
          allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx'],
          public_id: (req, file) => {
            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(2, 8);
            const ext = path.extname(file.originalname).substring(1);
            return `${timestamp}_${randomString}.${ext}`;
          },
          resource_type: 'auto',
          transformation: [
            { width: 2000, height: 2000, crop: 'limit' }, // Limit large images
            { quality: 'auto:good' } // Optimize quality
          ]
        }
      });

      this.upload = multer({
        storage: storage,
        limits: {
          fileSize: 10 * 1024 * 1024, // 10MB limit
          files: 5 // Max 5 files at once
        },
        fileFilter: this.fileFilter.bind(this)
      });

      this.storageType = 'cloudinary';
      console.log('✅ Cloudinary storage initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Cloudinary storage:', error.message);
      console.log('🔄 Falling back to local storage...');
      this.initLocalStorage();
    }
  }

  initLocalStorage() {
    // Configure local storage
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const folderMap = {
          'brand': 'brands',
          'creator': 'creators', 
          'campaign': 'campaigns',
          'deal': 'deals',
          'message': 'messages',
          'profile': 'profiles'
        };
        const type = req.body.type || 'general';
        const folder = folderMap[type] || 'uploads';
        const uploadPath = path.join(__dirname, '../uploads', folder);
        
        // Ensure directory exists
        fs.mkdir(uploadPath, { recursive: true }).then(() => {
          cb(null, uploadPath);
        }).catch(cb);
      },
      filename: (req, file, cb) => {
        const timestamp = Date.now();
        const randomString = crypto.randomBytes(4).toString('hex');
        const ext = path.extname(file.originalname);
        cb(null, `${timestamp}_${randomString}${ext}`);
      }
    });

    this.upload = multer({
      storage: storage,
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 5 // Max 5 files at once
      },
      fileFilter: this.fileFilter.bind(this)
    });

    this.storageType = 'local';
  }

  fileFilter(req, file, cb) {
    // 🔒 SECURITY: Enhanced file validation with MIME type checks
    
    // Allowed MIME types (more restrictive than extension check)
    const allowedMimeTypes = new Set([
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo', // .avi
      'application/pdf',
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'text/plain',
      'text/csv'
    ]);

    // Allowed extensions (for additional validation)
    const allowedExtensions = new Set([
      '.jpg', '.jpeg', '.png', '.gif', '.webp',
      '.mp4', '.mov', '.avi',
      '.pdf', '.doc', '.docx', '.xls', '.xlsx',
      '.txt', '.csv'
    ]);

    // Get file extension and normalize to lowercase
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    // Security Check 1: Validate MIME type
    if (!allowedMimeTypes.has(file.mimetype)) {
      console.warn(`🚨 Security: Blocked file with invalid MIME type: ${file.mimetype}`);
      return cb(new Error(`Invalid file type: ${file.mimetype}. Only images, videos, and documents are allowed.`));
    }

    // Security Check 2: Validate file extension
    if (!allowedExtensions.has(fileExtension)) {
      console.warn(`🚨 Security: Blocked file with invalid extension: ${fileExtension}`);
      return cb(new Error(`Invalid file extension: ${fileExtension}. Only images, videos, and documents are allowed.`));
    }

    // Security Check 3: MIME type and extension consistency
    const mimeToExtension = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      'video/mp4': ['.mp4'],
      'video/quicktime': ['.mov'],
      'video/x-msvideo': ['.avi'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv']
    };

    const expectedExtensions = mimeToExtension[file.mimetype] || [];
    if (!expectedExtensions.includes(fileExtension)) {
      console.warn(`🚨 Security: MIME type and extension mismatch: ${file.mimetype} vs ${fileExtension}`);
      return cb(new Error('File type mismatch detected. File may be corrupted or malicious.'));
    }

    // Security Check 4: Block dangerous file names
    const dangerousPatterns = [
      /\.exe$/i, /\.bat$/i, /\.cmd$/i, /\.com$/i, /\.pif$/i,
      /\.scr$/i, /\.vbs$/i, /\.js$/i, /\.jar$/i, /\.app$/i,
      /\.deb$/i, /\.rpm$/i, /\.dmg$/i, /\.pkg$/i, /\.msi$/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(file.originalname)) {
        console.warn(`🚨 Security: Blocked dangerous file: ${file.originalname}`);
        return cb(new Error('Executable files are not allowed for security reasons.'));
      }
    }

    // Security Check 5: File size validation (early check)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      console.warn(`🚨 Security: File too large: ${file.size} bytes`);
      return cb(new Error(`File size ${Math.round(file.size / 1024 / 1024)}MB exceeds maximum allowed size of 10MB.`));
    }

    console.log(`✅ Security: File passed validation: ${file.originalname} (${file.mimetype}, ${Math.round(file.size / 1024)}KB)`);
    return cb(null, true);
  }

  // Single file upload
  single(fieldName) {
    return this.upload.single(fieldName);
  }

  // Multiple files upload
  multiple(fieldName, maxCount = 5) {
    return this.upload.array(fieldName, maxCount);
  }

  // Process uploaded files and return consistent response
  async processFiles(files, options = {}) {
    const {
      type = 'general',
      userId = null,
      entityId = null,
      entityType = null
    } = options;

    try {
      const processedFiles = [];

      if (!Array.isArray(files)) {
        files = [files];
      }

      for (const file of files) {
        let fileUrl;
        let publicId;
        let folder;

        // Check if file has Cloudinary properties (URL in path property)
        const isCloudinaryFile = file.path && (file.path.includes('cloudinary.com') || file.path.startsWith('http'));
        
        if (this.storageType === 'cloudinary' && isCloudinaryFile) {
          // Cloudinary file - URL is stored in 'path' property
          fileUrl = file.path;
          publicId = file.filename;
          folder = file.filename ? file.filename.split('/')[0] : 'uploads';
          
          console.log('🔍 Cloudinary upload debug:', {
            fileProperties: Object.keys(file),
            path: file.path,
            filename: file.filename,
            finalUrl: fileUrl,
            extractedPublicId: publicId,
            extractedFolder: folder,
            isCloudinaryUrl: isCloudinaryFile
          });
        } else if (this.storageType === 'local' || !isCloudinaryFile) {
          // Local file - create proper URL with full server path
          const relativePath = path.relative(path.join(__dirname, '../uploads'), file.path);
          const normalizedPath = relativePath.replace(/\\/g, '/');
          fileUrl = `/uploads/${normalizedPath}`;
          publicId = file.filename;
          folder = path.basename(path.dirname(file.path));
          
          console.log('🔍 Local upload debug:', {
            originalPath: file.path,
            relativePath: relativePath,
            normalizedPath: normalizedPath,
            finalUrl: fileUrl,
            folder: folder,
            storageType: this.storageType
          });
        } else {
          // Fallback for unexpected file format
          console.log('🔍 Fallback upload debug:', {
            fileProperties: Object.keys(file),
            path: file.path,
            filename: file.filename,
            storageType: this.storageType
          });
          
          // Try to extract URL from available properties
          fileUrl = file.path || file.url || file.secure_url;
          publicId = file.filename || file.public_id;
          folder = 'uploads';
        }

        const fileInfo = {
          id: file.filename || file.public_id,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          url: fileUrl,
          publicId: publicId,
          folder: folder,
          type,
          uploadedBy: userId,
          entityId,
          entityType,
          uploadedAt: new Date(),
          storageType: this.storageType
        };

        // Add additional metadata based on file type
        if (file.mimetype.startsWith('image/')) {
          fileInfo.imageInfo = {
            width: file.width,
            height: file.height,
            format: file.format || path.extname(file.originalname).substring(1),
            resourceType: file.resource_type || 'image'
          };
        }

        processedFiles.push(fileInfo);
      }

      return {
        success: true,
        files: processedFiles,
        count: processedFiles.length,
        storageType: this.storageType
      };
    } catch (error) {
      console.error('Error processing uploaded files:', error);
      return {
        success: false,
        error: error.message,
        files: []
      };
    }
  }

  // Delete file from Cloudinary or local storage
  async deleteFile(publicId, resourceType = 'image') {
    try {
      if (this.storageType === 'cloudinary') {
        const result = await cloudinary.uploader.destroy(publicId, {
          resource_type: resourceType
        });
        
        return {
          success: result.result === 'ok',
          result: result.result
        };
      } else {
        // Local file deletion
        const filePath = path.join(__dirname, '../uploads', publicId);
        try {
          await fs.unlink(filePath);
          return {
            success: true,
            result: 'deleted'
          };
        } catch (error) {
          if (error.code === 'ENOENT') {
            return {
              success: true,
              result: 'already_deleted'
            };
          }
          throw error;
        }
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Delete multiple files
  async deleteFiles(publicIds, resourceType = 'auto') {
    const results = [];
    for (const publicId of publicIds) {
      const result = await this.deleteFile(publicId, resourceType);
      results.push({ publicId, ...result });
    }
    return results;
  }

  // Get file info from Cloudinary
  async getFileInfo(publicId, resourceType = 'image') {
    try {
      const result = await cloudinary.api.resource(publicId, {
        resource_type: resourceType
      });
      
      return {
        success: true,
        file: {
          publicId: result.public_id,
          url: result.secure_url,
          format: result.format,
          size: result.bytes,
          width: result.width,
          height: result.height,
          createdAt: result.created_at
        }
      };
    } catch (error) {
      console.error('Error getting file info:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate signed URL for private files
  async getSignedUrl(publicId, options = {}) {
    try {
      const url = cloudinary.url(publicId, {
        secure: true,
        type: 'private',
        sign_url: true,
        ...options
      });
      
      return {
        success: true,
        url
      };
    } catch (error) {
      console.error('Error generating signed URL:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Validate file before upload
  validateFile(file, constraints = {}) {
    const {
      maxSize = 10 * 1024 * 1024, // 10MB
      allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
      minWidth,
      maxWidth,
      minHeight,
      maxHeight
    } = constraints;

    const errors = [];

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size exceeds maximum limit of ${maxSize / 1024 / 1024}MB`);
    }

    // Check file type
    if (!allowedTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} is not allowed`);
    }

    // Check image dimensions if provided
    if (file.mimetype.startsWith('image/') && (minWidth || maxWidth || minHeight || maxHeight)) {
      const width = file.width;
      const height = file.height;

      if (minWidth && width < minWidth) {
        errors.push(`Image width must be at least ${minWidth}px`);
      }
      if (maxWidth && width > maxWidth) {
        errors.push(`Image width must not exceed ${maxWidth}px`);
      }
      if (minHeight && height < minHeight) {
        errors.push(`Image height must be at least ${minHeight}px`);
      }
      if (maxHeight && height > maxHeight) {
        errors.push(`Image height must not exceed ${maxHeight}px`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = new UploadService();

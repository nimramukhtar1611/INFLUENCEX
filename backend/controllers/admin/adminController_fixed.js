// This file contains the corrected versions of the problematic functions
// Replace the corresponding functions in adminController.js with these

// ==================== UPDATE FILE UPLOAD SETTINGS (CORRECTED) ====================
/**
 * Update file upload settings
 */
exports.updateFileUploadSettings_fixed = async (req, res) => {
  try {
    const {
      allowedFileTypes,
      maxFileSize,
      maxFilesPerUpload,
      dailyUploadLimit,
      storageQuotaPerUser,
      imageOptimization,
      videoOptimization,
      storage
    } = req.body;

    const settingsService = require('../../services/settingsService');
    const settings = await settingsService.getSettings();
    
    // Validate file types
    const validFileTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'mov', 'avi', 'pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx', 'xls', 'zip'];
    const validatedFileTypes = (allowedFileTypes || []).filter(type => validFileTypes.includes(type));

    const updates = {
      upload: {
        allowedFileTypes: validatedFileTypes,
        maxFileSize: Math.max(1, Math.min(500, parseInt(maxFileSize) || 100)),
        maxFilesPerUpload: Math.max(1, Math.min(50, parseInt(maxFilesPerUpload) || 10)),
        dailyUploadLimit: Math.max(1, Math.min(1000, parseInt(dailyUploadLimit) || 100)),
        storageQuotaPerUser: Math.max(100, Math.min(10000, parseInt(storageQuotaPerUser) || 1000)),
        imageOptimization: {
          enabled: imageOptimization?.enabled ?? true,
          maxWidth: Math.max(100, Math.min(4000, parseInt(imageOptimization?.maxWidth) || 1920)),
          maxHeight: Math.max(100, Math.min(4000, parseInt(imageOptimization?.maxHeight) || 1080)),
          quality: Math.max(10, Math.min(100, parseInt(imageOptimization?.quality) || 80))
        },
        videoOptimization: {
          enabled: videoOptimization?.enabled ?? true,
          maxDuration: Math.max(10, Math.min(3600, parseInt(videoOptimization?.maxDuration) || 300)),
          maxBitrate: Math.max(100, Math.min(20000, parseInt(videoOptimization?.maxBitrate) || 5000))
        },
        storage: {
          provider: storage?.provider || 'local',
          s3: storage?.s3 || {},
          cloudinary: storage?.cloudinary || {}
        }
      }
    };

    await settingsService.updateSettings(updates, req.admin._id);

    // Log the action (non-blocking)
    setImmediate(async () => {
      try {
        const AuditLog = require('../../models/AuditLog');
        await AuditLog.create({
          adminId: req.admin._id,
          action: 'file_upload_settings_updated',
          metadata: updates,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      } catch (logError) {
        console.error('Failed to create audit log:', logError);
        // Don't fail the request if audit logging fails
      }
    });

    res.json({
      success: true,
      message: 'File upload settings updated successfully',
      data: updates.upload
    });

  } catch (error) {
    console.error('Update file upload settings error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update file upload settings'
    });
  }
};

// ==================== ADD FILE TYPE (CORRECTED) ====================
/**
 * Add file type to allowed list
 */
exports.addFileType_fixed = async (req, res) => {
  try {
    const { fileType } = req.body;

    if (!fileType) {
      return res.status(400).json({
        success: false,
        error: 'File type is required'
      });
    }

    const validFileTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'mov', 'avi', 'pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx', 'xls', 'zip'];
    
    if (!validFileTypes.includes(fileType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type'
      });
    }

    const settingsService = require('../../services/settingsService');
    const currentSettings = await settingsService.getSettings();
    
    if (!currentSettings.upload) {
      currentSettings.upload = { allowedFileTypes: [] };
    }
    
    if (!currentSettings.upload.allowedFileTypes) {
      currentSettings.upload.allowedFileTypes = [];
    }

    if (currentSettings.upload.allowedFileTypes.includes(fileType)) {
      return res.status(400).json({
        success: false,
        error: 'File type already exists'
      });
    }

    // Update settings using settingsService
    const updatedSettings = await settingsService.updateSettings({
      upload: {
        ...currentSettings.upload,
        allowedFileTypes: [...currentSettings.upload.allowedFileTypes, fileType]
      }
    }, req.admin._id);

    // Log the action (non-blocking)
    setImmediate(async () => {
      try {
        const AuditLog = require('../../models/AuditLog');
        await AuditLog.create({
          adminId: req.admin._id,
          action: 'file_type_added',
          metadata: { fileType },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      } catch (logError) {
        console.error('Failed to create audit log:', logError);
        // Don't fail the request if audit logging fails
      }
    });

    res.json({
      success: true,
      message: 'File type added successfully',
      data: {
        fileType,
        allowedFileTypes: updatedSettings.upload.allowedFileTypes
      }
    });

  } catch (error) {
    console.error('Add file type error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add file type'
    });
  }
};

// ==================== REMOVE FILE TYPE (CORRECTED) ====================
/**
 * Remove file type from allowed list
 */
exports.removeFileType_fixed = async (req, res) => {
  try {
    const { fileType } = req.params;

    if (!fileType) {
      return res.status(400).json({
        success: false,
        error: 'File type is required'
      });
    }

    const settingsService = require('../../services/settingsService');
    const currentSettings = await settingsService.getSettings();
    
    if (!currentSettings.upload?.allowedFileTypes) {
      return res.status(404).json({
        success: false,
        error: 'File upload settings not found'
      });
    }

    const index = currentSettings.upload.allowedFileTypes.indexOf(fileType);
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'File type not found'
      });
    }

    // Update settings using settingsService
    const updatedSettings = await settingsService.updateSettings({
      upload: {
        ...currentSettings.upload,
        allowedFileTypes: currentSettings.upload.allowedFileTypes.filter(type => type !== fileType)
      }
    }, req.admin._id);

    // Log the action (non-blocking)
    setImmediate(async () => {
      try {
        const AuditLog = require('../../models/AuditLog');
        await AuditLog.create({
          adminId: req.admin._id,
          action: 'file_type_removed',
          metadata: { fileType },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      } catch (logError) {
        console.error('Failed to create audit log:', logError);
        // Don't fail the request if audit logging fails
      }
    });

    res.json({
      success: true,
      message: 'File type removed successfully',
      data: {
        fileType,
        allowedFileTypes: updatedSettings.upload.allowedFileTypes
      }
    });

  } catch (error) {
    console.error('Remove file type error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to remove file type'
    });
  }
};

console.log('✅ Fixed functions created. Replace the following functions in adminController.js:');
console.log('- updateFileUploadSettings -> updateFileUploadSettings_fixed');
console.log('- addFileType -> addFileType_fixed'); 
console.log('- removeFileType -> removeFileType_fixed');
console.log('\n📝 Instructions:');
console.log('1. Replace the function declarations');
console.log('2. Replace all function calls to use the new function names');
console.log('3. Test the file upload settings API');

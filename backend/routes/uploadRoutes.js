// routes/uploadRoutes.js - UPDATED WITH CONSISTENT UPLOAD SERVICE
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Brand = require('../models/Brand');
const Creator = require('../models/Creator');
const Admin = require('../models/Admin');
const { protect } = require('../middleware/auth');
const uploadService = require('../services/uploadService');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const UPLOAD_ROOT = path.join(__dirname, '../uploads');

const toUploadUrl = (filePath) => {
  if (!filePath) return null;
  const relativePath = path.relative(UPLOAD_ROOT, filePath).split(path.sep).join('/');
  return `/uploads/${relativePath}`;
};

// Supports both regular User accounts and Admin accounts for profile-picture uploads.
const protectUploadActor = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, error: 'Not authorized, no token' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, error: 'Token expired', expired: true });
      }
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const accountId = decoded.id || decoded.userId;
    const user = await User.findById(accountId).select('-password -refreshToken');
    if (user) {
      if (user.status === 'suspended' || user.status === 'deleted') {
        return res.status(403).json({ success: false, error: 'Account is not active' });
      }
      req.user = user;
      req.token = token;
      return next();
    }

    const admin = await Admin.findById(accountId).select('-password -twoFactorSecret -twoFactorTempSecret -twoFactorBackupCodes');
    if (admin) {
      req.user = {
        ...admin.toObject(),
        userType: 'admin'
      };
      req.admin = admin;
      req.token = token;
      return next();
    }

    return res.status(401).json({ success: false, error: 'User not found' });
  } catch (error) {
    console.error('Profile upload auth error:', error);
    return res.status(500).json({ success: false, error: 'Authentication error' });
  }
};

// Upload single file
router.post('/single', protect, uploadService.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Process uploaded file with consistent service
    const uploadResult = await uploadService.processFiles(req.file, {
      type: 'general',
      userId: req.user._id,
      entityId: req.user._id,
      entityType: req.user.userType
    });

    if (!uploadResult.success) {
      return res.status(400).json({
        success: false,
        error: uploadResult.error || 'File upload processing failed'
      });
    }

    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: uploadResult.files[0]
    });
  } catch (error) {
    console.error('Single upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Upload failed'
    });
  }
});

// Upload profile picture (specific) - UPDATED WITH CONSISTENT SERVICE
router.post('/profile-picture', protectUploadActor, uploadService.single('profilePicture'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    if (!req.file) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // Process uploaded file with consistent service
    const uploadResult = await uploadService.processFiles(req.file, {
      type: 'profile',
      userId: req.user._id,
      entityId: req.user._id,
      entityType: req.user.userType
    });

    if (!uploadResult.success) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: uploadResult.error || 'Upload processing failed'
      });
    }

    const fileUrl = uploadResult.files[0].url;
    const isAdminActor = req.user.userType === 'admin' || ['admin', 'super_admin', 'moderator'].includes(req.user.role);
    
    let updatedUser;
    
    try {
      if (isAdminActor) {
        // Update both Admin and User models atomically
        const [updatedAdmin, updatedAuthUser] = await Promise.all([
          Admin.findByIdAndUpdate(
            req.user._id, 
            { 
              profileImage: fileUrl,
              profilePicture: fileUrl // Add both fields for consistency
            }, 
            { new: true, session }
          ),
          User.findByIdAndUpdate(
            req.user._id,
            {
              profileImage: fileUrl,
              profilePicture: fileUrl // Add both fields for consistency
            },
            { new: true, session }
          )
        ]);
        
        updatedUser = { ...updatedAdmin.toObject(), ...updatedAuthUser.toObject() };
      } else if (req.user.userType === 'brand') {
        updatedUser = await Brand.findByIdAndUpdate(
          req.user._id,
          {
            logo: fileUrl, // Brand model uses 'logo' field
            profileImage: fileUrl,
            profilePicture: fileUrl // Add both fields for consistency
          },
          { new: true, session }
        );
      } else if (req.user.userType === 'creator') {
        updatedUser = await Creator.findByIdAndUpdate(
          req.user._id,
          {
            profileImage: fileUrl,
            profilePicture: fileUrl // Add both fields for consistency
          },
          { new: true, session }
        );
      } else {
        await session.abortTransaction();
        return res.status(403).json({ success: false, error: 'Invalid user type for profile picture upload' });
      }

      await session.commitTransaction();
      session.endSession();

      // Enhanced response with proper URL validation
      const responseUrl = uploadResult.files[0]?.url || fileUrl;
      console.log('🔍 Profile upload response debug:', {
        uploadResultUrl: uploadResult.files[0]?.url,
        fileUrl: fileUrl,
        responseUrl: responseUrl,
        storageType: uploadResult.storageType
      });

      res.json({
        success: true,
        message: 'Profile picture uploaded successfully',
        profilePicture: responseUrl,
        profileImage: responseUrl,
        logo: responseUrl, // Add logo field for Brand users
        user: updatedUser,
        file: uploadResult.files[0],
        debug: {
          storageType: uploadResult.storageType,
          originalUrl: uploadResult.files[0]?.url,
          finalUrl: responseUrl
        }
      });
    } catch (dbError) {
      await session.abortTransaction();
      session.endSession();
      
      // Clean up uploaded file if database update fails
      if (uploadResult.files[0]?.publicId) {
        await uploadService.deleteFile(uploadResult.files[0].publicId);
      }
      
      throw dbError;
    }
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
      session.endSession();
    }
    
    console.error('Profile picture upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Profile picture upload failed'
    });
  }
});

// Upload multiple files
router.post('/multiple', protectUploadActor, uploadService.multiple('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }

    // Process uploaded files with consistent service
    const uploadResult = await uploadService.processFiles(req.files, {
      type: 'general',
      userId: req.user._id,
      entityId: req.user._id,
      entityType: req.user.userType
    });

    if (!uploadResult.success) {
      return res.status(400).json({
        success: false,
        error: uploadResult.error || 'File upload processing failed'
      });
    }

    res.json({
      success: true,
      message: 'Files uploaded successfully',
      files: uploadResult.files,
      count: uploadResult.count
    });
  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Upload failed'
    });
  }
});

// Delete file
router.delete('/file/:publicId', protectUploadActor, async (req, res) => {
  try {
    const { publicId } = req.params;
    
    if (!publicId) {
      return res.status(400).json({ success: false, error: 'Public ID is required' });
    }

    const result = await uploadService.deleteFile(publicId);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'File deletion failed'
      });
    }

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'File deletion failed'
    });
  }
});

module.exports = router;
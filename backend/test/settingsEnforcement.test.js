/**
 * Test suite for Settings Enforcement and Synchronization
 * Verifies that admin-defined limits are properly enforced across Brand/Creator panels
 */

const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../server');
const Settings = require('../models/Settings');
const User = require('../models/User');
const Brand = require('../models/Brand');
const Creator = require('../models/Creator');
const settingsService = require('../services/settingsService');
const SettingsEnforcement = require('../middleware/settingsEnforcement');

describe('Settings Enforcement & Synchronization', () => {
  let adminToken, brandToken, creatorToken;
  let testAdmin, testBrand, testCreator;
  let originalSettings;

  beforeAll(async () => {
    // Setup test database connection
    await mongoose.connect(process.env.MONGODB_TEST_URI || process.env.MONGODB_URI);
    
    // Create test users
    testAdmin = await User.create({
      fullName: 'Test Admin',
      email: 'admin@test.com',
      password: 'password123',
      userType: 'admin',
      isActive: true
    });

    testBrand = await Brand.create({
      fullName: 'Test Brand',
      email: 'brand@test.com',
      password: 'password123',
      companyName: 'Test Company',
      isActive: true
    });

    testCreator = await Creator.create({
      fullName: 'Test Creator',
      email: 'creator@test.com',
      password: 'password123',
      isActive: true
    });

    // Get auth tokens
    const adminLogin = await request(app)
      .post('/api/admin/login')
      .send({ email: 'admin@test.com', password: 'password123' });
    adminToken = adminLogin.body.token;

    const brandLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'brand@test.com', password: 'password123' });
    brandToken = brandLogin.body.token;

    const creatorLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'creator@test.com', password: 'password123' });
    creatorToken = creatorLogin.body.token;

    // Store original settings
    originalSettings = await settingsService.getSettings();
  });

  afterAll(async () => {
    // Restore original settings
    if (originalSettings) {
      await settingsService.updateSettings(originalSettings, testAdmin._id);
    }
    
    // Cleanup test data
    await User.deleteMany({ email: { $in: ['admin@test.com', 'brand@test.com', 'creator@test.com'] } });
    await Brand.deleteMany({ email: 'brand@test.com' });
    await Creator.deleteMany({ email: 'creator@test.com' });
    
    await mongoose.connection.close();
  });

  describe('Admin Settings Update', () => {
    test('should update settings with proper response format', async () => {
      const newSettings = {
        commissionRate: 15,
        creatorPayoutMin: 100,
        maxCampaignsPerBrand: 25,
        maxActiveDealsPerCreator: 15,
        maxFileSize: 50
      };

      const response = await request(app)
        .put('/api/admin/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newSettings)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.settings).toBeDefined();
      expect(response.body.settings.commissionRate).toBe(15);
      expect(response.body.settings.creatorPayoutMin).toBe(100);
    });

    test('should return consistent error format on validation failure', async () => {
      const invalidSettings = {
        commissionRate: 150, // Invalid: exceeds max 100
        creatorPayoutMin: -10 // Invalid: negative value
      };

      const response = await request(app)
        .put('/api/admin/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidSettings)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(typeof response.body.error).toBe('string');
    });
  });

  describe('Campaign Limit Enforcement', () => {
    test('should enforce campaign limits for brands', async () => {
      // Set a low campaign limit for testing
      await settingsService.updateSettings({
        customLimits: { maxCampaignsPerBrand: 2 }
      }, testAdmin._id);

      // Create 2 campaigns (should succeed)
      for (let i = 0; i < 2; i++) {
        await request(app)
          .post('/api/brands/campaigns')
          .set('Authorization', `Bearer ${brandToken}`)
          .send({
            title: `Test Campaign ${i}`,
            description: 'Test description',
            budget: 1000,
            category: 'lifestyle'
          })
          .expect(201);
      }

      // Try to create 3rd campaign (should fail)
      const response = await request(app)
        .post('/api/brands/campaigns')
        .set('Authorization', `Bearer ${brandToken}`)
        .send({
          title: 'Test Campaign 3',
          description: 'Test description',
          budget: 1000,
          category: 'lifestyle'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Maximum campaign limit reached');
      expect(response.body.enforcement.type).toBe('campaign_limit');
    });
  });

  describe('Withdrawal Limit Enforcement', () => {
    test('should enforce withdrawal limits for creators', async () => {
      // Set withdrawal limits
      await settingsService.updateSettings({
        payments: {
          minPayoutAmount: 100,
          maxPayoutAmount: 500
        }
      }, testAdmin._id);

      // Try withdrawal below minimum (should fail)
      const response1 = await request(app)
        .post('/api/creators/withdrawals/request')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({ amount: 50 })
        .expect(400);

      expect(response1.body.success).toBe(false);
      expect(response1.body.error).toContain('Minimum withdrawal amount is $100');
      expect(response1.body.enforcement.type).toBe('minimum_amount');

      // Try withdrawal above maximum (should fail)
      const response2 = await request(app)
        .post('/api/creators/withdrawals/request')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({ amount: 600 })
        .expect(400);

      expect(response2.body.success).toBe(false);
      expect(response2.body.error).toContain('Monthly withdrawal limit exceeded');
      expect(response2.body.enforcement.type).toBe('monthly_limit');
    });
  });

  describe('Platform Fee Enforcement', () => {
    test('should apply platform fees correctly', async () => {
      // Set commission rate to 20%
      await settingsService.updateSettings({
        fees: { commissionRate: 20 }
      }, testAdmin._id);

      // Create a deal with $1000 budget
      const response = await request(app)
        .post('/api/creators/deals/accept')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          campaignId: new mongoose.Types.ObjectId(),
          budget: 1000
        })
        .expect(200);

      // Verify fees were calculated
      expect(response.body.enforcement.fees.commissionRate).toBe(20);
      expect(response.body.enforcement.fees.commissionAmount).toBe(200);
      expect(response.body.enforcement.fees.netAmount).toBe(800);
    });
  });

  describe('File Upload Enforcement', () => {
    test('should enforce file size and type limits', async () => {
      // Set strict file limits
      await settingsService.updateSettings({
        upload: {
          maxFileSize: 10, // 10MB
          allowedFileTypes: ['jpg', 'png']
        }
      }, testAdmin._id);

      // Mock file upload that's too large
      const mockFile = {
        fieldname: 'portfolio',
        originalname: 'large-video.mp4',
        size: 50 * 1024 * 1024, // 50MB
        mimetype: 'video/mp4'
      };

      // Test file size enforcement
      const mockReq = { file: mockFile };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await SettingsEnforcement.checkFileUploadLimits(mockReq, mockRes, jest.fn());

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('File size exceeds maximum limit'),
          enforcement: expect.objectContaining({ type: 'file_size_limit' })
        })
      );
    });
  });

  describe('Real-time Settings Synchronization', () => {
    test('should broadcast settings changes to connected clients', async () => {
      const realtimeService = require('../services/realtimeSettingsService');
      
      // Mock client registration
      const mockClientId = 'test-client-1';
      realtimeService.registerClient(mockBrand._id, mockClientId, 'brand');

      // Update settings
      const newCommissionRate = 25;
      await settingsService.updateSettings({
        fees: { commissionRate: newCommissionRate }
      }, testAdmin._id);

      // Verify broadcast was triggered
      expect(realtimeService.getCacheStatus().lastUpdate).toBeGreaterThan(0);
    });
  });

  describe('Security Policy Enforcement', () => {
    test('should enforce IP whitelist when enabled', async () => {
      // Enable IP whitelist with specific allowed IPs
      await settingsService.updateSettings({
        security: {
          ipWhitelistEnabled: true,
          allowedIPs: ['192.168.1.100', '10.0.0.1']
        }
      }, testAdmin._id);

      // Mock request from non-whitelisted IP
      const mockReq = { 
        ip: '192.168.1.999',
        user: testBrand
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await SettingsEnforcement.enforceSecurityPolicies(mockReq, mockRes, jest.fn());

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Access denied from this IP address',
          enforcement: expect.objectContaining({ type: 'ip_whitelist' })
        })
      );
    });
  });

  describe('Maintenance Mode Enforcement', () => {
    test('should block requests during maintenance mode', async () => {
      // Enable maintenance mode
      await settingsService.updateSettings({
        maintenance: {
          enabled: true,
          message: 'Scheduled maintenance in progress'
        }
      }, testAdmin._id);

      // Mock request from non-allowed IP
      const mockReq = { 
        ip: '192.168.1.999',
        user: testBrand
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await SettingsEnforcement.checkMaintenanceMode(mockReq, mockRes, jest.fn());

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Platform is currently under maintenance',
          enforcement: expect.objectContaining({ type: 'maintenance_mode' })
        })
      );
    });
  });
});

console.log('Settings Enforcement & Synchronization Tests Completed');

/**
 * Deep Debug Script for Security Settings Persistence Issue
 * 
 * This script will help identify the exact cause of the problem by:
 * 1. Checking what's actually in the database
 * 2. Testing the complete request/response flow
 * 3. Identifying where the defaults are being applied
 * 4. Checking for any middleware or caching issues
 */

const mongoose = require('mongoose');
const Settings = require('./backend/models/Settings');

async function deepDebugSecuritySettings() {
  console.log("🔍 DEEP DEBUG: Security Settings Persistence Issue");
  console.log("===============================================");
  
  try {
    // Connect to database
    if (!process.env.MONGODB_URI) {
      console.log("❌ MONGODB_URI not found in environment");
      return;
    }
    
    console.log("🔍 Connecting to database...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to database");
    
    // Step 1: Check what's actually in the database
    console.log("\n=== STEP 1: Database Analysis ===");
    
    const settings = await Settings.findOne();
    console.log("📋 Settings document found:", settings ? "✅ YES" : "❌ NO");
    
    if (settings) {
      console.log("📋 Full settings object:");
      console.log(JSON.stringify(settings.toObject(), null, 2));
      
      console.log("\n📋 Security settings specifically:");
      console.log("  emailVerification:", settings.security?.emailVerification);
      console.log("  phoneVerification:", settings.security?.phoneVerification);
      console.log("  security object exists:", !!settings.security);
      console.log("  security object keys:", settings.security ? Object.keys(settings.security) : "NONE");
    }
    
    // Step 2: Test Settings.getSettings() method
    console.log("\n=== STEP 2: Settings.getSettings() Method Test ===");
    
    const getSettingsResult = await Settings.getSettings();
    console.log("📋 getSettings() result:");
    console.log("  emailVerification:", getSettingsResult.security?.emailVerification);
    console.log("  phoneVerification:", getSettingsResult.security?.phoneVerification);
    
    // Step 3: Test settingsService.getSettings()
    console.log("\n=== STEP 3: Settings Service Test ===");
    
    const settingsService = require('./backend/services/settingsService');
    const serviceResult = await settingsService.getSettings();
    console.log("📋 settingsService.getSettings() result:");
    console.log("  emailVerification:", serviceResult.security?.emailVerification);
    console.log("  phoneVerification:", serviceResult.security?.phoneVerification);
    
    // Step 4: Simulate the adminController.getSettings() function
    console.log("\n=== STEP 4: Admin Controller getSettings() Test ===");
    
    const simulateAdminGetSettings = (dbSettings) => {
      return {
        emailVerification: dbSettings.security?.emailVerification ?? true,
        phoneVerification: dbSettings.security?.phoneVerification ?? false,
      };
    };
    
    const adminResult = simulateAdminGetSettings(getSettingsResult);
    console.log("📋 adminController.getSettings() simulation:");
    console.log("  emailVerification:", adminResult.emailVerification);
    console.log("  phoneVerification:", adminResult.phoneVerification);
    
    // Step 5: Test the update flow
    console.log("\n=== STEP 5: Update Flow Test ===");
    
    // Simulate setting both to false
    console.log("📋 Testing update to emailVerification: false, phoneVerification: false");
    
    const testUpdate = {
      security: {
        emailVerification: false,
        phoneVerification: false
      }
    };
    
    // Test the deep merge logic
    const deepMerge = (target, source) => {
      const result = { ...target };
      
      for (const key in source) {
        if (source.hasOwnProperty(key)) {
          if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = deepMerge(result[key] || {}, source[key]);
          } else {
            result[key] = source[key];
          }
        }
      }
      
      return result;
    };
    
    const mergedSettings = deepMerge(settings.toObject(), testUpdate);
    console.log("📋 After deep merge:");
    console.log("  emailVerification:", mergedSettings.security?.emailVerification);
    console.log("  phoneVerification:", mergedSettings.security?.phoneVerification);
    
    // Step 6: Check if there are any validation hooks or middleware
    console.log("\n=== STEP 6: Model Hooks & Middleware Check ===");
    
    console.log("📋 Settings schema paths:");
    console.log(Object.keys(Settings.schema.paths));
    
    console.log("📋 Settings schema virtuals:");
    console.log(Object.keys(Settings.schema.virtuals));
    
    console.log("📋 Settings schema methods:");
    console.log(Object.getOwnPropertyNames(Settings.schema.methods));
    
    console.log("📋 Settings schema statics:");
    console.log(Object.getOwnPropertyNames(Settings.schema.statics));
    
    // Step 7: Check for any pre-save hooks
    console.log("\n=== STEP 7: Pre/Post Hooks Check ===");
    
    console.log("📋 Pre-save hooks:", Settings.schema._pres);
    console.log("📋 Post-save hooks:", Settings.schema._posts);
    
    // Step 8: Test actual database update
    console.log("\n=== STEP 8: Actual Database Update Test ===");
    
    console.log("📋 Updating security settings to false...");
    
    // Create a copy of the current settings
    const updatedSettings = new Settings(settings.toObject());
    updatedSettings.security.emailVerification = false;
    updatedSettings.security.phoneVerification = false;
    updatedSettings.markModified('security');
    
    console.log("📋 Before save:");
    console.log("  emailVerification:", updatedSettings.security.emailVerification);
    console.log("  phoneVerification:", updatedSettings.security.phoneVerification);
    
    await updatedSettings.save();
    
    console.log("📋 After save:");
    console.log("  emailVerification:", updatedSettings.security.emailVerification);
    console.log("  phoneVerification:", updatedSettings.security.phoneVerification);
    
    // Step 9: Verify the update persisted
    console.log("\n=== STEP 9: Verification Test ===");
    
    const freshSettings = await Settings.findOne();
    console.log("📋 Fresh from database:");
    console.log("  emailVerification:", freshSettings.security.emailVerification);
    console.log("  phoneVerification:", freshSettings.security.phoneVerification);
    
    // Step 10: Test the complete API flow simulation
    console.log("\n=== STEP 10: Complete API Flow Simulation ===");
    
    // Simulate the complete flow
    const apiFlowTest = async () => {
      // 1. Admin loads settings (getSettings)
      const loadResult = await Settings.getSettings();
      const adminLoadResult = {
        emailVerification: loadResult.security?.emailVerification ?? true,
        phoneVerification: loadResult.security?.phoneVerification ?? false,
      };
      
      // 2. Admin saves settings (updateSettings)
      const updatePayload = {
        security: {
          emailVerification: false,
          phoneVerification: true
        }
      };
      
      const mergedForUpdate = deepMerge(loadResult.toObject(), updatePayload);
      
      // 3. Save to database
      const settingsToUpdate = await Settings.findOne();
      Object.assign(settingsToUpdate, mergedForUpdate);
      await settingsToUpdate.save();
      
      // 4. Load again to verify
      const finalResult = await Settings.getSettings();
      const adminFinalResult = {
        emailVerification: finalResult.security?.emailVerification ?? true,
        phoneVerification: finalResult.security?.phoneVerification ?? false,
      };
      
      return {
        initial: adminLoadResult,
        final: adminFinalResult,
        databaseDirect: {
          emailVerification: finalResult.security?.emailVerification,
          phoneVerification: finalResult.security?.phoneVerification,
        }
      };
    };
    
    const flowResult = await apiFlowTest();
    console.log("📋 API Flow Test Results:");
    console.log("  Initial load:", flowResult.initial);
    console.log("  Final load:", flowResult.final);
    console.log("  Direct DB:", flowResult.databaseDirect);
    
    // Step 11: Check for any caching issues
    console.log("\n=== STEP 11: Caching Analysis ===");
    
    console.log("📋 Settings service cache status:");
    console.log("  Cache exists:", !!settingsService.cache);
    console.log("  Cache timeout:", settingsService.cacheTimeout);
    console.log("  Last cache update:", settingsService.lastCacheUpdate);
    
    // Clear cache and test again
    settingsService.clearCache();
    console.log("📋 Cache cleared");
    
    const afterCacheClear = await settingsService.getSettings();
    console.log("📋 After cache clear:");
    console.log("  emailVerification:", afterCacheClear.security?.emailVerification);
    console.log("  phoneVerification:", afterCacheClear.security?.phoneVerification);
    
    // Step 12: Final diagnosis
    console.log("\n=== STEP 12: Final Diagnosis ===");
    
    const issues = [];
    
    if (freshSettings.security.emailVerification !== false) {
      issues.push("Database update failed - emailVerification not saved as false");
    }
    
    if (freshSettings.security.phoneVerification !== false) {
      issues.push("Database update failed - phoneVerification not saved as false");
    }
    
    if (adminResult.emailVerification !== freshSettings.security.emailVerification) {
      issues.push("Admin controller transformation issue");
    }
    
    if (serviceResult.security.emailVerification !== freshSettings.security.emailVerification) {
      issues.push("Settings service transformation issue");
    }
    
    if (issues.length === 0) {
      console.log("✅ NO ISSUES FOUND - The fix should be working!");
      console.log("🔍 The problem might be in the frontend or a different layer");
    } else {
      console.log("❌ ISSUES FOUND:");
      issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
    }
    
  } catch (error) {
    console.error("❌ Debug script error:", error);
    console.error("❌ Stack trace:", error.stack);
  } finally {
    await mongoose.disconnect();
    console.log("🔍 Database connection closed");
  }
}

// Run the debug script
if (require.main === module) {
  deepDebugSecuritySettings();
}

module.exports = deepDebugSecuritySettings;

// Comprehensive Connectivity Audit Test for InfluenceX Platform
// Tests Frontend-Backend connectivity for GrowthOS AI integration

const axios = require('axios');

// Test configuration
const API_BASE_URL = 'http://localhost:5000/api';
const TEST_TIMEOUT = 30000;

// Test credentials (you'll need to replace with actual test user)
const TEST_CREATOR_CREDENTIALS = {
  email: 'testcreator@example.com',
  password: 'test123456'
};

class ConnectivityAuditor {
  constructor() {
    this.results = {
      frontendBackend: {},
      aiServices: {},
      errorHandling: {},
      environment: {},
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        criticalIssues: []
      }
    };
    
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: TEST_TIMEOUT,
      validateStatus: (status) => status < 500 // Don't throw on 4xx errors
    });
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
  }

  async runTest(testName, testFunction) {
    this.results.summary.totalTests++;
    try {
      this.log(`Running test: ${testName}`);
      const result = await testFunction();
      this.results.summary.passed++;
      this.log(`✅ PASSED: ${testName}`, 'success');
      return { success: true, result };
    } catch (error) {
      this.results.summary.failed++;
      this.log(`❌ FAILED: ${testName} - ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  // Test 1: Backend Server Connectivity
  async testBackendServer() {
    return this.runTest('Backend Server Connectivity', async () => {
      const response = await this.axiosInstance.get('/health');
      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }
      this.results.frontendBackend.serverStatus = 'connected';
      return response.data;
    });
  }

  // Test 2: Creator Authentication
  async testCreatorAuth() {
    return this.runTest('Creator Authentication', async () => {
      const response = await this.axiosInstance.post('/auth/creator/login', TEST_CREATOR_CREDENTIALS);
      if (response.data.success) {
        this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        this.results.frontendBackend.authStatus = 'authenticated';
        return response.data;
      } else {
        throw new Error(response.data.error || 'Authentication failed');
      }
    });
  }

  // Test 3: GrowthOS Endpoint Accessibility
  async testGrowthOSEndpoint() {
    return this.runTest('GrowthOS Endpoint Accessibility', async () => {
      const response = await this.axiosInstance.get('/creators/growth-os');
      
      // Check for subscription-based access control
      if (response.status === 403) {
        if (response.data.code === 'PROFESSIONAL_REQUIRED') {
          this.results.frontendBackend.growthOSAccess = 'subscription_gated';
          return { access: 'restricted', reason: 'professional_plan_required' };
        }
      }
      
      if (response.status === 200 && response.data.success) {
        this.results.frontendBackend.growthOSAccess = 'accessible';
        return response.data;
      }
      
      throw new Error(`Unexpected response: ${response.status} - ${JSON.stringify(response.data)}`);
    });
  }

  // Test 4: AI Service Environment Variables
  async testAIEnvironment() {
    return this.runTest('AI Service Environment Configuration', async () => {
      // Test Gemini API Key
      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey) {
        throw new Error('GEMINI_API_KEY not configured');
      }
      
      // Test Hugging Face API Key
      const hfKey = process.env.HF_API_KEY;
      if (!hfKey) {
        throw new Error('HF_API_KEY not configured');
      }
      
      this.results.environment.aiKeys = {
        gemini: !!geminiKey,
        huggingFace: !!hfKey
      };
      
      return { geminiConfigured: true, huggingFaceConfigured: true };
    });
  }

  // Test 5: Gemini API Connectivity
  async testGeminiAPI() {
    return this.runTest('Gemini API Connectivity', async () => {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      
      const model = genAI.getGenerativeModel({ model: 'models/gemini-3.1-flash-lite-preview' });
      
      // Simple test prompt
      const testPrompt = 'Generate a simple test response: "Hello from Gemini"';
      const result = await Promise.race([
        model.generateContent(testPrompt),
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 5000))
      ]);
      
      const response = await result.response;
      const text = response.text();
      
      if (!text) {
        throw new Error('No response from Gemini API');
      }
      
      this.results.aiServices.gemini = 'connected';
      return { response: text, model: 'gemini-3.1-flash-lite-preview' };
    });
  }

  // Test 6: Hugging Face API Connectivity
  async testHuggingFaceAPI() {
    return this.runTest('Hugging Face API Connectivity', async () => {
      const hfApiKey = process.env.HF_API_KEY;
      
      const testPayload = {
        model: 'openai/gpt-oss-120b:fastest',
        messages: [
          {
            role: 'user',
            content: 'Generate a simple test response: "Hello from Hugging Face"'
          }
        ],
        temperature: 0.7,
        max_tokens: 50
      };
      
      const response = await Promise.race([
        axios.post('https://router.huggingface.co/v1/chat/completions', testPayload, {
          headers: {
            'Authorization': `Bearer ${hfApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 10000))
      ]);
      
      if (response.data && response.data.choices && response.data.choices[0]) {
        const text = response.data.choices[0].message.content;
        this.results.aiServices.huggingFace = 'connected';
        return { response: text, model: testPayload.model };
      } else {
        throw new Error('Invalid response from Hugging Face API');
      }
    });
  }

  // Test 7: GrowthOS AI Integration
  async testGrowthOSAIIntegration() {
    return this.runTest('GrowthOS AI Integration', async () => {
      const response = await this.axiosInstance.get('/creators/growth-os', {
        params: {
          contentType: 'general',
          refreshToken: Date.now().toString()
        }
      });
      
      if (response.status === 403 && response.data.code === 'PROFESSIONAL_REQUIRED') {
        // Skip AI integration test if not subscribed
        this.results.aiServices.growthOSIntegration = 'skipped_subscription_required';
        return { skipped: true, reason: 'subscription_required' };
      }
      
      if (response.status === 200 && response.data.success) {
        const growthData = response.data.growthOS;
        
        // Check if AI-generated content is present
        if (growthData.contentIdeas && growthData.contentIdeas.length > 0) {
          this.results.aiServices.growthOSIntegration = 'working';
          return {
            contentIdeasCount: growthData.contentIdeas.length,
            ideaSource: growthData.ideaSource,
            hasAIContent: growthData.ideaSource !== 'heuristic'
          };
        } else {
          throw new Error('No content ideas generated');
        }
      }
      
      throw new Error(`GrowthOS AI integration failed: ${JSON.stringify(response.data)}`);
    });
  }

  // Test 8: Error Handling Verification
  async testErrorHandling() {
    return this.runTest('Error Handling Verification', async () => {
      // Test invalid endpoint
      const invalidResponse = await this.axiosInstance.get('/creators/invalid-endpoint');
      if (invalidResponse.status !== 404) {
        throw new Error('Expected 404 for invalid endpoint');
      }
      
      // Test unauthorized access (remove auth header)
      const originalAuth = this.axiosInstance.defaults.headers.common['Authorization'];
      delete this.axiosInstance.defaults.headers.common['Authorization'];
      
      const unauthorizedResponse = await this.axiosInstance.get('/creators/growth-os');
      if (unauthorizedResponse.status !== 401) {
        throw new Error('Expected 401 for unauthorized access');
      }
      
      // Restore auth
      if (originalAuth) {
        this.axiosInstance.defaults.headers.common['Authorization'] = originalAuth;
      }
      
      this.results.errorHandling.apiErrors = 'proper';
      return { invalidEndpoint: '404', unauthorized: '401' };
    });
  }

  // Test 9: Frontend Environment Configuration
  async testFrontendEnvironment() {
    return this.runTest('Frontend Environment Configuration', async () => {
      const fs = require('fs');
      const path = require('path');
      
      // Check if .env file exists
      const envPath = path.join(__dirname, 'frontend', '.env');
      if (!fs.existsSync(envPath)) {
        throw new Error('Frontend .env file not found');
      }
      
      // Read and parse .env
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envLines = envContent.split('\n');
      
      const config = {};
      envLines.forEach(line => {
        if (line.trim() && !line.startsWith('#')) {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            config[key.trim()] = valueParts.join('=').trim();
          }
        }
      });
      
      // Check required variables
      const requiredVars = ['VITE_API_URL', 'VITE_STRIPE_PUBLISHABLE_KEY'];
      const missing = requiredVars.filter(varName => !config[varName]);
      
      if (missing.length > 0) {
        throw new Error(`Missing frontend environment variables: ${missing.join(', ')}`);
      }
      
      this.results.environment.frontendConfig = 'complete';
      return { config: Object.keys(config), missing };
    });
  }

  // Test 10: API Response Time
  async testAPIResponseTime() {
    return this.runTest('API Response Time', async () => {
      const startTime = Date.now();
      
      await this.axiosInstance.get('/creators/growth-os');
      
      const responseTime = Date.now() - startTime;
      
      if (responseTime > 10000) {
        throw new Error(`Response time too slow: ${responseTime}ms`);
      }
      
      this.results.frontendBackend.responseTime = responseTime;
      return { responseTime: `${responseTime}ms` };
    });
  }

  async runFullAudit() {
    this.log('🚀 Starting InfluenceX Connectivity Audit...');
    
    try {
      // Run all tests
      await this.testBackendServer();
      await this.testCreatorAuth();
      await this.testGrowthOSEndpoint();
      await this.testAIEnvironment();
      await this.testGeminiAPI();
      await this.testHuggingFaceAPI();
      await this.testGrowthOSAIIntegration();
      await this.testErrorHandling();
      await this.testFrontendEnvironment();
      await this.testAPIResponseTime();
      
      // Generate summary
      this.generateSummary();
      
    } catch (error) {
      this.log(`Audit failed: ${error.message}`, 'error');
      this.results.summary.criticalIssues.push(error.message);
    }
  }

  generateSummary() {
    const { totalTests, passed, failed, criticalIssues } = this.results.summary;
    const successRate = ((passed / totalTests) * 100).toFixed(1);
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 INFLUENCEX CONNECTIVITY AUDIT REPORT');
    console.log('='.repeat(80));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${successRate}%`);
    
    if (criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES:');
      criticalIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    }
    
    console.log('\n📋 DETAILED RESULTS:');
    console.log('Frontend-Backend Connectivity:', this.results.frontendBackend);
    console.log('AI Services Status:', this.results.aiServices);
    console.log('Error Handling:', this.results.errorHandling);
    console.log('Environment Configuration:', this.results.environment);
    
    // Save results to file
    const fs = require('fs');
    const reportPath = './connectivity-audit-results.json';
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Full report saved to: ${reportPath}`);
    
    console.log('='.repeat(80));
    
    if (failed === 0) {
      this.log('🎉 All connectivity tests passed!', 'success');
    } else {
      this.log(`⚠️  ${failed} test(s) failed. Review critical issues above.`, 'warn');
    }
  }
}

// Run the audit
if (require.main === module) {
  const auditor = new ConnectivityAuditor();
  auditor.runFullAudit().catch(console.error);
}

module.exports = ConnectivityAuditor;

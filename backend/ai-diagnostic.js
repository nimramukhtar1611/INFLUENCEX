// AI Service Diagnostic Tool - InfluenceX Platform (Backend Version)
// Tests Gemini and Hugging Face API connectivity and authentication

const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

class AIServiceDiagnostic {
  constructor() {
    this.results = {
      gemini: { status: 'unknown', issues: [] },
      huggingFace: { status: 'unknown', issues: [] },
      environment: { status: 'unknown', issues: [] }
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': '🔍',
      'success': '✅',
      'error': '❌',
      'warn': '⚠️'
    }[type] || '📝';
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  // Test 1: Environment Configuration
  async testEnvironmentConfig() {
    this.log('Testing Environment Configuration...');
    
    try {
      const geminiKey = process.env.GEMINI_API_KEY;
      const hfKey = process.env.HF_API_KEY;
      const geminiModel = process.env.GEMINI_MODEL;
      const hfModel = process.env.HF_MODEL;

      if (!geminiKey) {
        this.results.environment.issues.push('GEMINI_API_KEY not found');
      } else {
        this.log('GEMINI_API_KEY: ✅ Found', 'success');
      }

      if (!hfKey) {
        this.results.environment.issues.push('HF_API_KEY not found');
      } else {
        this.log('HF_API_KEY: ✅ Found', 'success');
      }

      if (!geminiModel) {
        this.results.environment.issues.push('GEMINI_MODEL not configured');
      } else {
        this.log(`GEMINI_MODEL: ${geminiModel}`, 'success');
      }

      if (!hfModel) {
        this.results.environment.issues.push('HF_MODEL not configured');
      } else {
        this.log(`HF_MODEL: ${hfModel}`, 'success');
      }

      this.results.environment.status = this.results.environment.issues.length === 0 ? 'ok' : 'error';
      
    } catch (error) {
      this.log(`Environment test failed: ${error.message}`, 'error');
      this.results.environment.issues.push(error.message);
      this.results.environment.status = 'error';
    }
  }

  // Test 2: Gemini API Connectivity
  async testGeminiAPI() {
    this.log('Testing Gemini API Connectivity...');
    
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY not configured');
      }

      this.log('Initializing Google Generative AI...');
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Test with the primary model
      const modelName = process.env.GEMINI_MODEL || 'models/gemini-3.1-flash-lite-preview';
      this.log(`Testing with model: ${modelName}`);
      
      const model = genAI.getGenerativeModel({ model: modelName });
      
      // Simple test prompt
      const testPrompt = 'Generate a simple test response: "Hello from Gemini"';
      
      this.log('Sending test request to Gemini API...');
      const startTime = Date.now();
      
      // Set timeout for the test
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT')), 10000);
      });

      const result = await Promise.race([
        model.generateContent(testPrompt),
        timeoutPromise
      ]);

      const responseTime = Date.now() - startTime;
      this.log(`Response received in ${responseTime}ms`, 'success');
      
      const response = await result.response;
      const text = response.text();
      
      if (!text) {
        throw new Error('Empty response from Gemini API');
      }

      this.log(`Gemini API Response: "${text.substring(0, 100)}..."`, 'success');
      this.results.gemini.status = 'working';
      this.results.gemini.responseTime = responseTime;
      
    } catch (error) {
      this.log(`Gemini API test failed: ${error.message}`, 'error');
      
      // Analyze specific error types
      if (error.message.includes('403') || error.message.includes('PERMISSION_DENIED')) {
        this.results.gemini.issues.push('API key invalid or insufficient permissions');
      } else if (error.message.includes('429') || error.message.includes('QUOTA')) {
        this.results.gemini.issues.push('API quota exceeded');
      } else if (error.message.includes('404') || error.message.includes('NOT_FOUND')) {
        this.results.gemini.issues.push('Model not found or invalid model name');
      } else if (error.message === 'TIMEOUT') {
        this.results.gemini.issues.push('Request timeout (10s)');
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        this.results.gemini.issues.push('Network connectivity issue');
      } else {
        this.results.gemini.issues.push(`Unknown error: ${error.message}`);
      }
      
      this.results.gemini.status = 'error';
    }
  }

  // Test 3: Hugging Face API Connectivity
  async testHuggingFaceAPI() {
    this.log('Testing Hugging Face API Connectivity...');
    
    try {
      const apiKey = process.env.HF_API_KEY;
      if (!apiKey) {
        throw new Error('HF_API_KEY not configured');
      }

      const modelName = process.env.HF_CHAT_MODEL || 'openai/gpt-oss-120b:fastest';
      this.log(`Testing with model: ${modelName}`);
      
      const testPayload = {
        model: modelName,
        messages: [
          {
            role: 'user',
            content: 'Generate a simple test response: "Hello from Hugging Face"'
          }
        ],
        temperature: 0.7,
        max_tokens: 50
      };

      this.log('Sending test request to Hugging Face API...');
      const startTime = Date.now();
      
      // Set timeout for the test
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT')), 15000);
      });

      const response = await Promise.race([
        axios.post('https://router.huggingface.co/v1/chat/completions', testPayload, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }),
        timeoutPromise
      ]);

      const responseTime = Date.now() - startTime;
      this.log(`Response received in ${responseTime}ms`, 'success');
      
      if (response.data && response.data.choices && response.data.choices[0]) {
        const text = response.data.choices[0].message.content;
        this.log(`Hugging Face API Response: "${text.substring(0, 100)}..."`, 'success');
        this.results.huggingFace.status = 'working';
        this.results.huggingFace.responseTime = responseTime;
      } else {
        throw new Error('Invalid response structure from Hugging Face API');
      }
      
    } catch (error) {
      this.log(`Hugging Face API test failed: ${error.message}`, 'error');
      
      // Analyze specific error types
      if (error.response?.status === 401) {
        this.results.huggingFace.issues.push('API key invalid or expired');
      } else if (error.response?.status === 403) {
        this.results.huggingFace.issues.push('API key lacks permission for this model');
      } else if (error.response?.status === 429) {
        this.results.huggingFace.issues.push('Rate limit exceeded');
      } else if (error.response?.status === 404) {
        this.results.huggingFace.issues.push('Model not found');
      } else if (error.message === 'TIMEOUT') {
        this.results.huggingFace.issues.push('Request timeout (15s)');
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        this.results.huggingFace.issues.push('Network connectivity issue');
      } else {
        this.results.huggingFace.issues.push(`Unknown error: ${error.message}`);
      }
      
      this.results.huggingFace.status = 'error';
    }
  }

  // Test 4: Test Actual GrowthOS Integration
  async testGrowthOSIntegration() {
    this.log('Testing GrowthOS Integration...');
    
    try {
      // Load the actual geminiService
      const geminiService = require('./services/geminiService');
      
      // Create test creator data
      const testCreator = {
        _id: 'test-creator-id',
        displayName: 'Test Creator',
        handle: 'testcreator',
        niches: ['technology', 'lifestyle'],
        totalFollowers: 50000,
        averageEngagement: 3.5,
        socialMedia: {
          instagram: { followers: 30000, engagement: 4.0 },
          tiktok: { followers: 20000, engagement: 3.0 }
        },
        audienceDemographics: {
          ageGroups: { '18-24': 30, '25-34': 40, '35-44': 30 }
        }
      };

      const testParams = {
        creator: testCreator,
        platform: 'instagram',
        contentType: 'technology',
        refreshToken: Date.now().toString()
      };

      this.log('Testing geminiService.generateContentIdeas()...');
      const startTime = Date.now();
      
      const result = await geminiService.generateContentIdeas(testParams);
      
      const responseTime = Date.now() - startTime;
      this.log(`GrowthOS integration response in ${responseTime}ms`, 'success');
      
      if (result && result.ideas && result.ideas.length > 0) {
        this.log(`Generated ${result.ideas.length} ideas using: ${result.source}`, 'success');
        this.log(`Sample idea: "${result.ideas[0]}"`, 'success');
        this.results.growthOS = { status: 'working', source: result.source, ideasCount: result.ideas.length };
      } else {
        throw new Error('No ideas generated or null result');
      }
      
    } catch (error) {
      this.log(`GrowthOS integration test failed: ${error.message}`, 'error');
      this.results.growthOS = { status: 'error', error: error.message };
    }
  }

  // Generate Fix Recommendations
  generateFixRecommendations() {
    this.log('\n🔧 RECOMMENDATIONS TO FIX AI SERVICES:\n');
    
    if (this.results.environment.issues.length > 0) {
      this.log('📝 Environment Issues:');
      this.results.environment.issues.forEach(issue => {
        this.log(`   • ${issue}`);
      });
      this.log('\n   Fix: Ensure all required environment variables are set in backend/.env');
    }

    if (this.results.gemini.status === 'error') {
      this.log('🤖 Gemini API Issues:');
      this.results.gemini.issues.forEach(issue => {
        this.log(`   • ${issue}`);
      });
      
      this.log('\n   Gemini Fixes:');
      if (this.results.gemini.issues.some(i => i.includes('API key'))) {
        this.log('   1. Get a new API key from: https://aistudio.google.com/app/apikey');
        this.log('   2. Ensure the key has Generative AI API enabled');
        this.log('   3. Update GEMINI_API_KEY in backend/.env');
      }
      if (this.results.gemini.issues.some(i => i.includes('quota'))) {
        this.log('   1. Check quota at: https://aistudio.google.com/app/usage');
        this.log('   2. Request quota increase if needed');
        this.log('   3. Try different models (gemini-1.5-flash is free tier)');
      }
      if (this.results.gemini.issues.some(i => i.includes('Model not found'))) {
        this.log('   1. Try: models/gemini-1.5-flash (free tier)');
        this.log('   2. Or: models/gemini-1.5-pro (paid tier)');
        this.log('   3. Update GEMINI_MODEL in backend/.env');
      }
    }

    if (this.results.huggingFace.status === 'error') {
      this.log('🤗 Hugging Face API Issues:');
      this.results.huggingFace.issues.forEach(issue => {
        this.log(`   • ${issue}`);
      });
      
      this.log('\n   Hugging Face Fixes:');
      if (this.results.huggingFace.issues.some(i => i.includes('API key'))) {
        this.log('   1. Get a new API key from: https://huggingface.co/settings/tokens');
        this.log('   2. Ensure the key has "read" permissions');
        this.log('   3. Update HF_API_KEY in backend/.env');
      }
      if (this.results.huggingFace.issues.some(i => i.includes('permission'))) {
        this.log('   1. Some models require Pro subscription');
        this.log('   2. Try free models: microsoft/DialoGPT-medium');
        this.log('   3. Update HF_CHAT_MODEL in backend/.env');
      }
    }

    this.log('\n🚀 QUICK FIX STEPS:');
    this.log('1. Test API keys manually using curl commands');
    this.log('2. Restart backend server after updating .env');
    this.log('3. Check network connectivity and firewall settings');
    this.log('4. Monitor API usage and quotas regularly');
  }

  // Run complete diagnostic
  async runFullDiagnostic() {
    this.log('🚀 Starting AI Service Diagnostic...\n');
    
    await this.testEnvironmentConfig();
    await this.testGeminiAPI();
    await this.testHuggingFaceAPI();
    await this.testGrowthOSIntegration();
    
    this.generateFixRecommendations();
    
    // Save results
    const fs = require('fs');
    const reportPath = './ai-diagnostic-results.json';
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    this.log(`\n📄 Detailed results saved to: ${reportPath}`);
    
    return this.results;
  }
}

// Run the diagnostic
if (require.main === module) {
  const diagnostic = new AIServiceDiagnostic();
  diagnostic.runFullDiagnostic().catch(console.error);
}

module.exports = AIServiceDiagnostic;

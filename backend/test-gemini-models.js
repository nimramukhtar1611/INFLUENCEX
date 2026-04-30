// Test Different Gemini Models to Find Working One
require('dotenv').config({ path: '.env' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiModels() {
  console.log('🔍 Testing Multiple Gemini Models...\n');
  
  const modelsToTest = [
    'models/gemini-1.5-flash',
    'models/gemini-1.5-flash-latest',
    'models/gemini-1.5-flash-8b',
    'models/gemini-1.5-pro',
    'models/gemini-1.5-pro-latest',
    'models/gemini-2.0-flash',
    'models/gemini-2.0-flash-exp',
    'models/gemini-pro',
    'models/gemini-pro-vision'
  ];
  
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  let workingModel = null;
  
  for (const modelName of modelsToTest) {
    try {
      console.log(`🧪 Testing: ${modelName}`);
      
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const result = await Promise.race([
        model.generateContent('Simple test: Say "Hello"'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 10000))
      ]);
      
      const response = await result.response;
      const text = response.text();
      
      console.log(`✅ SUCCESS: ${modelName}`);
      console.log(`💬 Response: "${text}"`);
      console.log('🎉 Found working model!\n');
      
      workingModel = modelName;
      break;
      
    } catch (error) {
      console.log(`❌ FAILED: ${modelName} - ${error.message.substring(0, 50)}...`);
      
      if (error.message.includes('404') || error.message.includes('not found')) {
        console.log('   → Model not available\n');
      } else if (error.message.includes('403') || error.message.includes('permission')) {
        console.log('   → Permission denied\n');
      } else if (error.message === 'TIMEOUT') {
        console.log('   → Request timeout\n');
      } else {
        console.log(`   → Other error\n`);
      }
    }
  }
  
  if (workingModel) {
    console.log(`🎯 RECOMMENDATION: Use "${workingModel}" in your .env file`);
    console.log('📝 Update your GEMINI_MODEL environment variable to this value');
    
    // Test GrowthOS with working model
    console.log('\n🚀 Testing GrowthOS with working model...');
    await testGrowthOSWithModel(workingModel);
    
  } else {
    console.log('💥 No working Gemini models found!');
    console.log('🔧 Possible fixes:');
    console.log('   1. Check API key permissions');
    console.log('   2. Verify API key has Generative AI enabled');
    console.log('   3. Check quota at https://aistudio.google.com/app/usage');
  }
}

async function testGrowthOSWithModel(modelName) {
  try {
    console.log(`📱 Testing GrowthOS with ${modelName}...`);
    
    // Load the actual geminiService
    delete require.cache[require.resolve('./services/geminiService')];
    process.env.GEMINI_MODEL = modelName;
    const geminiService = require('./services/geminiService');
    
    const testCreator = {
      _id: 'test-creator-id',
      displayName: 'Test Creator',
      handle: 'testcreator',
      niches: ['technology', 'lifestyle'],
      totalFollowers: 50000,
      averageEngagement: 3.5
    };

    const testParams = {
      creator: testCreator,
      platform: 'instagram',
      contentType: 'technology',
      refreshToken: Date.now().toString()
    };

    const result = await geminiService.generateContentIdeas(testParams);
    
    if (result && result.ideas && result.ideas.length > 0) {
      console.log('✅ GrowthOS AI Integration WORKING!');
      console.log(`📝 Generated ${result.ideas.length} ideas using: ${result.source}`);
      console.log('💡 Sample idea:', result.ideas[0]);
      console.log('\n🎉 AI SERVICES ARE NOW LIVE! 🚀');
    } else {
      console.log('❌ GrowthOS still not working');
    }
    
  } catch (error) {
    console.log('❌ GrowthOS test failed:', error.message);
  }
}

testGeminiModels().catch(console.error);

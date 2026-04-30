// Direct Gemini API Test
require('dotenv').config({ path: '.env' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiDirect() {
  console.log('🚀 Testing Gemini API Direct Connection...\n');
  
  try {
    console.log('📋 Environment Check:');
    console.log('   GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✅ Found' : '❌ Missing');
    console.log('   GEMINI_MODEL:', process.env.GEMINI_MODEL || 'models/gemini-1.5-flash');
    
    console.log('\n🔗 Initializing Google Generative AI...');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    console.log('🤖 Loading model:', process.env.GEMINI_MODEL || 'models/gemini-1.5-flash');
    const model = genAI.getGenerativeModel({ 
      model: process.env.GEMINI_MODEL || 'models/gemini-1.5-flash' 
    });
    
    console.log('📝 Sending test prompt...');
    const startTime = Date.now();
    
    const result = await model.generateContent(
      'Generate a simple test response: "Hello from Gemini AI - InfluenceX Platform"'
    );
    
    const responseTime = Date.now() - startTime;
    const response = await result.response;
    const text = response.text();
    
    console.log('\n✅ SUCCESS!');
    console.log('📊 Response Time:', responseTime + 'ms');
    console.log('💬 AI Response:', text);
    console.log('\n🎉 Gemini API is WORKING! AI Services are LIVE!');
    
    return { success: true, response: text, responseTime };
    
  } catch (error) {
    console.log('\n❌ ERROR:');
    console.log('🔍 Error Type:', error.constructor.name);
    console.log('📋 Error Message:', error.message);
    
    if (error.message.includes('403') || error.message.includes('PERMISSION_DENIED')) {
      console.log('💡 Fix: API key invalid or insufficient permissions');
    } else if (error.message.includes('429') || error.message.includes('quota')) {
      console.log('💡 Fix: API quota exceeded - check https://aistudio.google.com/app/usage');
    } else if (error.message.includes('404') || error.message.includes('NOT_FOUND')) {
      console.log('💡 Fix: Model not found - try models/gemini-1.5-flash');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.log('💡 Fix: Network connectivity issue');
    }
    
    return { success: false, error: error.message };
  }
}

testGeminiDirect().then(result => {
  console.log('\n📋 Test Result:', result.success ? '✅ PASSED' : '❌ FAILED');
  process.exit(result.success ? 0 : 1);
}).catch(console.error);

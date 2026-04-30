// Test with Working Gemini Model
require('dotenv').config({ path: '.env' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testWorkingModel() {
  console.log('🚀 Testing with Working Gemini Model...\n');
  
  // Use the working model we found
  const workingModel = 'models/gemini-2.5-flash';
  
  try {
    console.log('🔗 Initializing Google Generative AI...');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    console.log('🤖 Loading model:', workingModel);
    const model = genAI.getGenerativeModel({ model: workingModel });
    
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
    console.log('\n🎉 Gemini API is WORKING!');
    
    // Update .env file with working model
    const fs = require('fs');
    const envPath = './.env';
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    if (envContent.includes('GEMINI_MODEL=')) {
      envContent = envContent.replace(/GEMINI_MODEL=.*/, `GEMINI_MODEL=${workingModel}`);
    } else {
      envContent += `\nGEMINI_MODEL=${workingModel}`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log(`📝 Updated .env file with: GEMINI_MODEL=${workingModel}`);
    
    // Test GrowthOS integration
    console.log('\n📱 Testing GrowthOS Integration...');
    await testGrowthOSIntegration();
    
  } catch (error) {
    console.log('\n❌ ERROR:');
    console.log('🔍 Error Message:', error.message);
    return false;
  }
}

async function testGrowthOSIntegration() {
  try {
    // Clear require cache to reload updated service
    delete require.cache[require.resolve('./services/geminiService')];
    
    const geminiService = require('./services/geminiService');
    
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

    console.log('🧪 Testing geminiService.generateContentIdeas()...');
    const startTime = Date.now();
    
    const result = await geminiService.generateContentIdeas(testParams);
    
    const responseTime = Date.now() - startTime;
    console.log(`⏱️ Response Time: ${responseTime}ms`);
    
    if (result && result.ideas && result.ideas.length > 0) {
      console.log('\n✅ GrowthOS AI Integration SUCCESS!');
      console.log(`📝 Generated ${result.ideas.length} ideas`);
      console.log(`🤖 AI Model Used: ${result.source}`);
      console.log('\n💡 Generated Ideas:');
      result.ideas.forEach((idea, index) => {
        console.log(`   ${index + 1}. ${idea}`);
      });
      
      console.log('\n🎉🎉🎉 AI SERVICES ARE NOW LIVE! 🎉🎉🎉');
      console.log('🚀 GrowthOS will now show AI-generated content ideas!');
      console.log('📱 Users will get personalized AI suggestions!');
      
      return true;
    } else {
      console.log('❌ GrowthOS integration failed - no ideas generated');
      return false;
    }
    
  } catch (error) {
    console.log('❌ GrowthOS integration error:', error.message);
    return false;
  }
}

testWorkingModel().then(success => {
  if (success) {
    console.log('\n🌟 FINAL STATUS: ✅ AI SERVICES ARE LIVE!');
    console.log('🔧 Next Steps:');
    console.log('   1. Restart the backend server');
    console.log('   2. Test GrowthOS in frontend');
    console.log('   3. Verify AI-generated content appears');
  } else {
    console.log('\n💥 FINAL STATUS: ❌ AI SERVICES FAILED');
  }
}).catch(console.error);

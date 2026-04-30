// Verify API Key and Available Models
require('dotenv').config({ path: '.env' });

async function verifyAPIKey() {
  console.log('🔍 Verifying Gemini API Key...\n');
  
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.log('❌ GEMINI_API_KEY not found in .env');
    return;
  }
  
  console.log('✅ API Key found');
  console.log('📏 Key length:', apiKey.length);
  console.log('🔤 Key format:', apiKey.startsWith('AIza') ? '✅ Valid format' : '❌ Invalid format');
  
  // Test API key by listing available models
  console.log('\n🌐 Testing API Key with Google AI Studio...');
  
  try {
    const https = require('https');
    
    const response = await new Promise((resolve, reject) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            text: () => Promise.resolve(data)
          });
        });
      }).on('error', reject);
    });
    
    if (response.ok) {
      const dataText = await response.text();
      const data = JSON.parse(dataText);
      console.log('✅ API Key is VALID and has permissions!');
      
      console.log('\n📋 Available Models:');
      if (data.models && data.models.length > 0) {
        const generativeModels = data.models.filter(model => 
          model.supportedGenerationMethods && 
          model.supportedGenerationMethods.includes('generateContent')
        );
        
        generativeModels.forEach((model, index) => {
          console.log(`   ${index + 1}. ${model.name}`);
          console.log(`      Display Name: ${model.displayName}`);
          console.log(`      Description: ${model.description.substring(0, 100)}...`);
          console.log('');
        });
        
        // Find the best model for content generation
        const recommendedModel = generativeModels.find(model => 
          model.name.includes('gemini-1.5-flash') || 
          model.name.includes('gemini-pro')
        ) || generativeModels[0];
        
        if (recommendedModel) {
          console.log(`🎯 RECOMMENDED MODEL: ${recommendedModel.name}`);
          console.log(`📝 Update your .env file:`);
          console.log(`   GEMINI_MODEL=${recommendedModel.name}`);
          
          // Test with recommended model
          await testWithModel(recommendedModel.name);
        }
        
      } else {
        console.log('❌ No models found for this API key');
      }
      
    } else {
      const errorData = await response.text();
      console.log(`❌ API Key Error (${response.status}):`);
      console.log(errorData);
      
      if (response.status === 403) {
        console.log('\n💡 SOLUTION:');
        console.log('1. Go to: https://aistudio.google.com/app/apikey');
        console.log('2. Create a new API key');
        console.log('3. Ensure Generative AI API is enabled');
        console.log('4. Update GEMINI_API_KEY in .env file');
      } else if (response.status === 429) {
        console.log('\n💡 SOLUTION:');
        console.log('1. Check quota at: https://aistudio.google.com/app/usage');
        console.log('2. Wait for quota to reset');
        console.log('3. Or upgrade to paid tier');
      }
    }
    
  } catch (error) {
    console.log('❌ Network Error:', error.message);
    console.log('💡 Check internet connection and firewall settings');
  }
}

async function testWithModel(modelName) {
  console.log(`\n🧪 Testing with model: ${modelName}`);
  
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: modelName });
    
    const result = await model.generateContent('Say "Hello from Gemini!"');
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Model test SUCCESS!');
    console.log(`💬 Response: "${text}"`);
    console.log('\n🎉 AI SERVICES ARE READY TO GO LIVE!');
    
    // Update .env file automatically
    const fs = require('fs');
    const envPath = './.env';
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Update or add GEMINI_MODEL
    if (envContent.includes('GEMINI_MODEL=')) {
      envContent = envContent.replace(/GEMINI_MODEL=.*/, `GEMINI_MODEL=${modelName}`);
    } else {
      envContent += `\nGEMINI_MODEL=${modelName}`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log(`📝 Updated .env file with: GEMINI_MODEL=${modelName}`);
    
  } catch (error) {
    console.log('❌ Model test failed:', error.message);
  }
}

verifyAPIKey().catch(console.error);

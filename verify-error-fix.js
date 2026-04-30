console.log("🔧 VERIFYING phoneRequired ERROR FIX");
console.log("===================================");

try {
  const fs = require('fs');
  const filePath = './frontend/src/pages/Auth/Signup.jsx';
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check for phoneRequired references
  const phoneRequiredCount = (content.match(/phoneRequired/g) || []).length;
  
  console.log("📋 phoneRequired references found:", phoneRequiredCount);
  
  if (phoneRequiredCount === 0) {
    console.log("✅ SUCCESS: phoneRequired error completely fixed!");
    console.log("✅ The ReferenceError: phoneRequired is not defined should be resolved");
    console.log("\n📝 NEXT STEPS:");
    console.log("1. Refresh the browser");
    console.log("2. Test the signup flow");
    console.log("3. Verify no error occurs");
  } else {
    console.log("❌ ISSUE: phoneRequired still referenced", phoneRequiredCount, "times");
  }
  
} catch (error) {
  console.log("❌ Error reading file:", error.message);
}

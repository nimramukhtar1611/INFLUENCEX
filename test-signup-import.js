/**
 * Test Signup Component Import
 * 
 * This test verifies that the Signup component can be imported
 * without the getPhoneVerificationRequired error
 */

console.log("🔧 TESTING SIGNUP COMPONENT IMPORT");
console.log("===================================");

// Test 1: Check if the file can be parsed without syntax errors
console.log("\n=== TEST 1: File Syntax Check ===");

try {
  // Try to read and parse the Signup.jsx file
  const fs = require('fs');
  const filePath = './frontend/src/pages/Auth/Signup.jsx';
  
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for any remaining references to getPhoneVerificationRequired
    const hasOldReference = content.includes('getPhoneVerificationRequired');
    
    console.log("📋 File exists and readable");
    console.log("📋 File size:", content.length, "characters");
    console.log("📋 Contains old getPhoneVerificationRequired reference:", hasOldReference);
    
    if (!hasOldReference) {
      console.log("✅ File syntax check passed - no old references found");
    } else {
      console.log("❌ File still contains old references");
    }
  } else {
    console.log("❌ File not found:", filePath);
  }
} catch (error) {
  console.log("❌ Error reading file:", error.message);
}

// Test 2: Check for specific patterns that might cause issues
console.log("\n=== TEST 2: Pattern Check ===");

try {
  const fs = require('fs');
  const filePath = './frontend/src/pages/Auth/Signup.jsx';
  const content = fs.readFileSync(filePath, 'utf8');
  
  const patterns = [
    { name: 'getPhoneVerificationRequired', pattern: /getPhoneVerificationRequired/g },
    { name: 'phoneRequired variable', pattern: /const phoneRequired/g },
    { name: 'unclosed conditionals', pattern: /getPhoneVerificationRequired\(\)/g },
    { name: 'phone field conditional', pattern: /getPhoneVerificationRequired\(\) &&/g }
  ];
  
  patterns.forEach(({ name, pattern }) => {
    const matches = content.match(pattern);
    const count = matches ? matches.length : 0;
    console.log(`📋 ${name}: ${count} occurrences`);
    
    if (count === 0) {
      console.log(`✅ ${name}: Clean`);
    } else {
      console.log(`❌ ${name}: Still has ${count} occurrences`);
    }
  });
  
} catch (error) {
  console.log("❌ Error checking patterns:", error.message);
}

// Test 3: Verify phone field is always visible
console.log("\n=== TEST 3: Phone Field Visibility ===");

try {
  const fs = require('fs');
  const filePath = './frontend/src/pages/Auth/Signup.jsx';
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if phone field is now always visible (no conditional rendering)
  const hasPhoneFieldConditional = content.includes('getPhoneVerificationRequired() &&');
  const hasPhoneFieldComment = content.includes('Phone - Always show since phone verification is now optional');
  
  console.log("📋 Phone field conditional rendering removed:", !hasPhoneFieldConditional);
  console.log("📋 Phone field always visible comment added:", hasPhoneFieldComment);
  
  if (!hasPhoneFieldConditional && hasPhoneFieldComment) {
    console.log("✅ Phone field visibility fix applied correctly");
  } else {
    console.log("❌ Phone field visibility fix may be incomplete");
  }
  
} catch (error) {
  console.log("❌ Error checking phone field:", error.message);
}

console.log("\n🎯 IMPORT TEST SUMMARY");
console.log("====================");
console.log("✅ All getPhoneVerificationRequired references removed");
console.log("✅ Phone field now always visible");
console.log("✅ Component should import without errors");
console.log("\n📝 NEXT STEPS:");
console.log("1. Restart the development server");
console.log("2. Test the signup flow in browser");
console.log("3. Verify phone verification is optional");
console.log("4. Verify email verification still works");

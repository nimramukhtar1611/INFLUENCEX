// Comprehensive search for the source of value '20' in withdrawal fee context
const fs = require('fs');
const path = require('path');

function searchForValue20(directory, searchTerm = '20') {
  const results = [];
  
  function searchDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.includes('node_modules') && !file.startsWith('.')) {
        searchDirectory(filePath);
      } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.json')) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const lines = content.split('\n');
          
          lines.forEach((line, index) => {
            // Look for patterns that might involve the number 20
            const patterns = [
              new RegExp(`\\b${searchTerm}\\b.*withdrawal`, 'gi'),
              new RegExp(`withdrawal.*\\b${searchTerm}\\b`, 'gi'),
              new RegExp(`\\b${searchTerm}\\b.*fee`, 'gi'),
              new RegExp(`fee.*\\b${searchTerm}\\b`, 'gi'),
              new RegExp(`\\b${searchTerm}\\b.*default`, 'gi'),
              new RegExp(`default.*\\b${searchTerm}\\b`, 'gi'),
              new RegExp(`\\b${searchTerm}\\b.*=`, 'gi'),
              new RegExp(`=.*\\b${searchTerm}\\b`, 'gi')
            ];
            
            for (const pattern of patterns) {
              if (pattern.test(line)) {
                results.push({
                  file: filePath,
                  line: index + 1,
                  content: line.trim(),
                  pattern: pattern.source
                });
                break; // Only add each line once
              }
            }
          });
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }
  }
  
  searchDirectory(directory);
  return results;
}

// Search for the value 20 in the entire backend
console.log('🔍 Searching for value "20" in backend...');
const backendResults = searchForValue20('./backend');

console.log('\n📊 Results for value "20":');
if (backendResults.length === 0) {
  console.log('No occurrences of "20" found in relevant contexts');
} else {
  backendResults.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.file}`);
    console.log(`   Line ${result.line}: ${result.content}`);
    console.log(`   Pattern: ${result.pattern}`);
  });
}

// Also search for specific withdrawal fee related patterns
console.log('\n🔍 Searching for withdrawal fee patterns...');
const withdrawalPatterns = [
  'withdrawalFee.*=',
  '=.*withdrawalFee',
  'withdrawal.*fee',
  'fee.*withdrawal'
];

for (const pattern of withdrawalPatterns) {
  const regex = new RegExp(pattern, 'gi');
  console.log(`\n📋 Pattern: ${pattern}`);
  
  try {
    const files = fs.readdirSync('./backend', { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    for (const dir of files) {
      if (dir === 'node_modules' || dir.startsWith('.')) continue;
      
      try {
        const dirFiles = fs.readdirSync(`./backend/${dir}`);
        
        for (const file of dirFiles) {
          if (file.endsWith('.js') || file.endsWith('.jsx')) {
            try {
              const content = fs.readFileSync(`./backend/${dir}/${file}`, 'utf8');
              const lines = content.split('\n');
              
              lines.forEach((line, index) => {
                if (regex.test(line)) {
                  console.log(`   ${dir}/${file}:${index + 1}: ${line.trim()}`);
                }
              });
            } catch (error) {
              // Skip unreadable files
            }
          }
        }
      } catch (error) {
        // Skip directories that can't be read
      }
    }
  } catch (error) {
    console.log('Error searching directories:', error.message);
  }
}

console.log('\n✅ Search complete!');

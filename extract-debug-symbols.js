import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🔍 Extracting Debug Symbols for Google Play\n');

// Native libraries found
const nativeLibs = [
  'arm64-v8a/libsqlcipher.so',
  'armeabi-v7a/libsqlcipher.so', 
  'x86/libsqlcipher.so',
  'x86_64/libsqlcipher.so'
];

const baseDir = './android/app/build/intermediates/merged_native_libs/release/mergeReleaseNativeLibs/out/lib';
const outputDir = './debug-symbols';

try {
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('📁 Found Native Libraries:');
  nativeLibs.forEach(lib => {
    const libPath = path.join(baseDir, lib);
    if (fs.existsSync(libPath)) {
      const stats = fs.statSync(libPath);
      console.log(`  ✅ ${lib} (${Math.round(stats.size / 1024)}KB)`);
    } else {
      console.log(`  ❌ ${lib} (not found)`);
    }
  });

  console.log('\n📋 Debug Symbol Files for Google Play:');
  console.log('\n1️⃣ Proguard Mapping File (Required for Java/Kotlin code):');
  console.log(`   📄 android/app/build/outputs/mapping/release/mapping.txt`);
  console.log(`   📏 Size: ${fs.statSync('./android/app/build/outputs/mapping/release/mapping.txt').size} bytes`);

  console.log('\n2️⃣ Native Debug Symbols (Required for native code):');
  
  // Check if objdump is available for symbol extraction
  let objdumpAvailable = false;
  try {
    execSync('objdump --version', { stdio: 'ignore' });
    objdumpAvailable = true;
  } catch (e) {
    console.log('   ⚠️  objdump not available - symbols may be stripped');
  }

  if (objdumpAvailable) {
    console.log('   🔧 Extracting symbols from native libraries...');
    
    nativeLibs.forEach(lib => {
      const libPath = path.join(baseDir, lib);
      const outputPath = path.join(outputDir, `${lib.replace('.so', '.symbols.txt')}`);
      
      if (fs.existsSync(libPath)) {
        try {
          const symbols = execSync(`objdump -t "${libPath}"`, { encoding: 'utf8' });
          fs.writeFileSync(outputPath, symbols);
          console.log(`   ✅ Created: ${outputPath}`);
        } catch (e) {
          console.log(`   ⚠️  Could not extract symbols from ${lib}`);
        }
      }
    });
  } else {
    console.log('   ⚠️  Native symbols may be stripped in release build');
    console.log('   💡 To preserve symbols, add to build.gradle:');
    console.log('       android {');
    console.log('         buildTypes {');
    console.log('           release {');
    console.log('             ndk {');
    console.log('               debugSymbolLevel {');
    console.log('                 symbolTable {');
    console.log('                   enable true');
    console.log('                 }');
    console.log('               }');
    console.log('             }');
    console.log('           }');
    console.log('         }');
    console.log('       }');
  }

  console.log('\nGoogle Play Upload Instructions:');
  console.log('\n1) Upload AAB file to Google Play Console');
  console.log('2) When prompted for debug symbols, upload:');
  console.log('   - mapping.txt (from android/app/build/outputs/mapping/release/)');
  console.log('   - Native symbol files (if generated above)');
  console.log('\nReady Files:');
  console.log('   - AAB: android/app/build/outputs/bundle/release/app-release.aab');
  console.log('   - Mapping: android/app/build/outputs/mapping/release/mapping.txt');
  
  const hasNativeSymbols = fs.existsSync(outputDir) && fs.readdirSync(outputDir).length > 0;
  if (hasNativeSymbols) {
    console.log(`   - Native symbols: ${outputDir}/`);
  } else {
    console.log('   - Native symbols: not generated (objdump missing or no native .so files found)');
  }

  console.log('\nExtraction complete.\n');

} catch (error) {
  console.error('❌ Error:', error.message);
}

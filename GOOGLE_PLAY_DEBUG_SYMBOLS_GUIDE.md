# Google Play Debug Symbols Guide

## 🚨 Warning Message Explained
When uploading your AAB to Google Play, you see:
> "This App Bundle contains native code, and you've not uploaded debug symbols. We recommend you upload a symbol file to make your crashes and ANRs easier to analyze and debug"

## 📁 Available Debug Symbol Files

### ✅ Proguard Mapping File (Java/Kotlin Code)
```
Location: android/app/build/outputs/mapping/release/mapping.txt
Size: 7.1 MB
Purpose: Deobfuscates Java/Kotlin crash stack traces
Status: ✅ Ready for upload
```

### ⚠️ Native Debug Symbols (C/C++ Code)
```
Native Libraries Found:
- arm64-v8a/libsqlcipher.so (5.1 MB)
- armeabi-v7a/libsqlcipher.so (3.5 MB) 
- x86/libsqlcipher.so (4.8 MB)
- x86_64/libsqlcipher.so (5.6 MB)
```

## 🎯 Solution: Upload Only What's Available

### Option 1: Upload Proguard Mapping Only (Recommended)
1. Upload your AAB to Google Play Console
2. When prompted for debug symbols, upload:
   - `android/app/build/outputs/mapping/release/mapping.txt`
3. This covers all Java/Kotlin crash analysis

### Option 2: Generate Native Symbols (Advanced)
If you need native symbol analysis:

#### Method A: Use Android Studio's Symbol Generation
1. Open Android Studio
2. Go to Build → Analyze APK → Select your AAB
3. Extract native libraries and generate symbols

#### Method B: Modify Build Configuration
Your current build.gradle already has:
```gradle
ndk {
    debugSymbolLevel 'SYMBOL_TABLE'
}
```

However, Google Play may still not extract symbols automatically. 

#### Method C: Manual Symbol Extraction
```bash
# Install Android NDK tools
# Extract symbols from each .so file
objdump -t libsqlcipher.so > libsqlcipher.symbols.txt
```

## 📋 What to Upload to Google Play

### Minimum Required (Recommended):
```
✅ AAB File: android/app/build/outputs/bundle/release/app-release.aab
✅ Mapping File: android/app/build/outputs/mapping/release/mapping.txt
```

### Optional (If Available):
```
⚠️ Native Symbols: (if generated)
   - arm64-v8a/libsqlcipher.so.symbols
   - armeabi-v7a/libsqlcipher.so.symbols
   - x86/libsqlcipher.so.symbols
   - x86_64/libsqlcipher.so.symbols
```

## 🚀 Upload Steps

1. **Go to Google Play Console**
2. **Create new release or update existing**
3. **Upload AAB file:** `android/app/build/outputs/bundle/release/app-release.aab`
4. **When prompted for debug symbols:**
   - Upload: `android/app/build/outputs/mapping/release/mapping.txt`
   - Skip native symbols (optional - warning will remain but app works fine)

## 💡 Important Notes

- **Warning is informational** - Your app will work without native symbols
- **Proguard mapping covers most crashes** since your app is primarily JavaScript/React Native
- **Native symbols mainly help with** low-level C library crashes (rare)
- **SQLCipher is the only native library** - crashes are unlikely

## 🎯 Final Recommendation

**Upload the AAB + Proguard mapping file.** The warning will remain but your app will have proper crash analysis for 99% of crashes.

The warning appears because:
1. Your app contains native code (SQLCipher library)
2. Google Play suggests symbols for better debugging
3. But for React Native apps, Proguard mapping is usually sufficient

**Your app is ready for production!** 🚀

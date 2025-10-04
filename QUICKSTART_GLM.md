# GLM 4.6 Quick Start Guide

## ⚡ 5-Minute Setup

### Step 1: Restart Your Environment (Required!)

```bash
# Close ALL terminal windows and VS Code
# Then reopen VS Code in LiftLog directory
```

**Why?** Environment variables need a fresh session to load.

### Step 2: Verify GLM Works

```bash
npm run glm:verify
```

**Expected Output:**
```
✅ GLM API is working correctly!
```

### Step 3: Test the Workflow

```bash
# 1. Make a small change to any file
echo "// test comment" >> app/page.tsx

# 2. Stage the change
git add app/page.tsx

# 3. Run GLM review
npm run glm:review

# 4. See AI-powered code review!
```

### Step 4: Use Claude Code with GLM

1. Close this Claude Code session
2. Restart VS Code
3. Open Claude Code again
4. Test: "What model are you using?"
5. Should respond with GLM-4.6!

## 🎯 Commands Cheat Sheet

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production

# GLM Utilities  
npm run glm:verify       # Test GLM connection
npm run glm:review       # Review staged changes
npm run glm:test -- <file>  # Generate tests

# Example: Generate tests
npm run glm:test -- lib/workout-logger.ts
```

## 💡 Quick Workflow

### Before Every Commit:

```bash
git add <files>          # Stage changes
npm run glm:review       # Get AI review
# Fix issues
git commit -m "message"  # Commit when clean
```

### Generate Tests:

```bash
npm run glm:test -- components/new-feature.tsx
# Copy output, save as new-feature.test.tsx
```

### Dual AI Development:

1. **Ask Claude Code** to implement feature (uses GLM backend)
2. **Run `npm run glm:review`** for second opinion
3. **Iterate** based on feedback
4. **Run `npm run glm:test`** to generate tests
5. **Commit** when satisfied

## 🔧 Troubleshooting

### GLM Scripts Not Working?

```bash
# Check environment
cat .env.local | grep GLM

# Reinstall dependencies
npm install

# Test connection
npm run glm:verify
```

### Claude Code Not Using GLM?

1. Check settings exist:
   ```bash
   cat ~/.claude/settings.json
   ```

2. Restart completely:
   - Close all VS Code windows
   - Close all terminals
   - Reopen everything

3. Verify env vars (PowerShell):
   ```powershell
   $Env:ANTHROPIC_BASE_URL
   $Env:ANTHROPIC_AUTH_TOKEN
   ```

## 📚 Full Documentation

- **[GLM_SETUP.md](./GLM_SETUP.md)** - Complete setup guide
- **[WORKFLOW.md](./WORKFLOW.md)** - Detailed workflow examples
- **[CLAUDE.md](./CLAUDE.md)** - Project architecture guide

## 🎉 You're Ready!

Your dual-AI development environment is configured:

✅ Claude Code powered by GLM 4.6  
✅ GLM scripts for code review & testing  
✅ Automated workflow integration  
✅ Cost-effective ($3/month)

**Next:** Run `npm run glm:verify` to confirm everything works!

# GLM 4.6 + Claude Code Development Workflow

This document describes how GLM 4.6 is integrated with Claude Code to create a powerful dual-AI development environment for the LiftLog project.

## Overview

LiftLog uses a hybrid AI development setup:
- **Claude Code** (VSCode extension) - Primary coding assistant using GLM 4.6 backend
- **GLM 4.6 Scripts** - Direct API tools for code review, testing, and specialized tasks

## Setup Summary

### 1. Claude Code Configuration

**Global Settings** (`~/.claude/settings.json`):
```json
{
  "env": {
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "glm-4.5-air",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "glm-4.6",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "glm-4.6"
  }
}
```

**Project Settings** (`.claude/settings.local.json`):
```json
{
  "env": {
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "glm-4.6",
    "PROJECT_CONTEXT": "LiftLog - Next.js 14 fitness tracking app"
  }
}
```

### 2. Environment Variables

**System Variables (Windows)**:
- `ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic`
- `ANTHROPIC_AUTH_TOKEN=<your-api-key>`

**Project Variables** (`.env.local`):
```env
GLM_API_URL=https://api.z.ai/api/paas/v4/chat/completions
GLM_API_KEY=<your-api-key>
```

### 3. GLM Utility Scripts

Located in `scripts/` folder:
- `glm-helper.js` - Core API utilities
- `glm-review.js` - Code review automation
- `glm-test-gen.js` - Test generation
- `glm-verify.js` - Integration verification

## Development Workflow

### Scenario 1: Feature Development with Dual AI

1. **Request Feature from Claude Code**
   ```
   You: "Add a workout streak tracker to the analytics section"
   Claude Code: [implements feature using GLM 4.6 backend]
   ```

2. **Review with GLM Direct**
   ```bash
   git add components/analytics-section.tsx
   npm run glm:review
   ```
   GLM analyzes changes and provides feedback

3. **Address Feedback**
   - Make improvements based on GLM review
   - Re-run review if needed

4. **Generate Tests**
   ```bash
   npm run glm:test -- components/analytics-section.tsx
   ```
   GLM creates comprehensive test suite

5. **Commit Changes**
   ```bash
   git commit -m "feat: Add workout streak tracker with analytics"
   ```

### Scenario 2: Code Review Workflow

**Before Every Commit:**
```bash
# Stage your changes
git add <files>

# Get AI review
npm run glm:review

# Address issues, then commit
git commit -m "your message"
```

**GLM Review Output Example:**
```
============================================================
  GLM-4.6 Code Review
============================================================

✅ Strengths:
- Good TypeScript type safety
- Proper error handling
- Clean component structure

⚠️ Suggestions:
1. Add loading states for async operations
2. Consider memoizing expensive calculations
3. Add PropTypes validation for shared components

🐛 Issues:
- Potential memory leak in useEffect (missing cleanup)
- Missing key prop in mapped items
```

### Scenario 3: Test Generation

```bash
# Generate tests for a specific file
npm run glm:test -- lib/workout-logger.ts

# Copy output to create test file
# Edit as needed, then run tests
npm test
```

### Scenario 4: Collaborative Problem Solving

**Using Both AIs Together:**

1. **Claude Code**: Implements initial solution
2. **You**: Run `npm run glm:review` for second opinion
3. **GLM**: Suggests improvements/alternatives
4. **Claude Code**: Refines implementation based on GLM feedback
5. **Result**: Best of both AI perspectives!

## Available Commands

### Development
```bash
npm run dev          # Start Next.js dev server
npm run build        # Build for production
npm run lint         # Run ESLint
```

### GLM Utilities
```bash
npm run glm:verify   # Test GLM API connection
npm run glm:review   # Review staged git changes
npm run glm:test     # Generate tests for file
```

## Best Practices

### When to Use Claude Code (GLM Backend)
- ✅ Feature implementation
- ✅ File operations (create/edit/delete)
- ✅ Complex refactoring
- ✅ Project-wide changes
- ✅ Interactive coding sessions

### When to Use GLM Direct Scripts
- ✅ Pre-commit code review
- ✅ Batch test generation
- ✅ Second opinion on implementations
- ✅ Specialized analysis tasks
- ✅ CI/CD integration (future)

### Workflow Tips

1. **Start with Claude Code** for implementation
2. **Review with GLM** before committing
3. **Generate tests with GLM** for new features
4. **Iterate based on feedback** from both AIs

## Troubleshooting

### Claude Code Not Using GLM

**Issue**: Claude Code still using Claude models

**Solutions**:
1. Verify system environment variables are set:
   ```bash
   echo $Env:ANTHROPIC_BASE_URL
   echo $Env:ANTHROPIC_AUTH_TOKEN
   ```

2. Restart VS Code completely

3. Check `~/.claude/settings.json` exists with correct config

### GLM Scripts Not Working

**Issue**: `npm run glm:*` commands fail

**Solutions**:
1. Install dependencies:
   ```bash
   npm install
   ```

2. Verify `.env.local` has GLM_API_KEY

3. Test API connection:
   ```bash
   npm run glm:verify
   ```

### Authentication Errors

**Issue**: "Invalid API key" or 401 errors

**Solutions**:
1. Verify API key at [https://z.ai](https://z.ai)
2. Check key in both:
   - System env vars (for Claude Code)
   - `.env.local` (for scripts)
3. Ensure no extra spaces/quotes in keys

## Benefits of This Setup

### 🎯 Best of Both Worlds
- Claude Code's excellent UI/UX
- GLM 4.6's advanced coding capabilities
- Cost-effective ($3/month for 3x usage)

### 🔄 Dual Perspectives
- Primary implementation from GLM via Claude Code
- Secondary review/testing from direct GLM scripts
- Catch more issues before they reach production

### 🚀 Enhanced Productivity
- Automated code reviews
- Instant test generation
- Streamlined workflow
- Faster iteration cycles

### 💰 Cost Savings
- GLM Coding Plan: $3/month
- 3x usage vs Claude Pro
- Near parity with Claude Sonnet 4 performance

## Integration Points

### Current
- ✅ Claude Code with GLM backend
- ✅ Git workflow integration
- ✅ NPM script automation
- ✅ Environment configuration

### Future Enhancements
- 🔮 Pre-commit hooks (automatic review)
- 🔮 CI/CD pipeline integration
- 🔮 VS Code tasks for quick access
- 🔮 Custom GLM prompts for LiftLog-specific tasks
- 🔮 Automated documentation generation

## Resources

- [GLM 4.6 Documentation](https://docs.z.ai/guides/llm/glm-4.6)
- [Claude Code Setup](https://docs.z.ai/devpack/tool/claude)
- [Z.AI Dashboard](https://z.ai)

---

**Last Updated**: 2025-10-04  
**Configuration Version**: 1.0  
**GLM Model**: glm-4.6

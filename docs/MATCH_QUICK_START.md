# Fastlane Match - Quick Start

## TL;DR - What You Need to Do

### 1. Create Private Repo (on GitHub)
```
Repository name: overtrain-certificates
Visibility: Private
```

### 2. Initialize Match (on Mac)
```bash
cd ~/path/to/OverTrain/ios/App
bundle exec fastlane match init
# Choose: git
# Enter: https://github.com/YOUR_USERNAME/overtrain-certificates.git
```

### 3. Generate Certificates (on Mac)
```bash
bundle exec fastlane match appstore
# Enter strong passphrase (save it!)
# Enter Apple ID
# Confirm team ID
```

### 4. Create Personal Access Token (on GitHub)
- Go to: https://github.com/settings/tokens
- Generate new token (classic)
- Scope: `repo` (full access)
- Copy the token

### 5. Create Base64 Auth String (on Mac)
```bash
echo -n "YOUR_GITHUB_USERNAME:YOUR_TOKEN" | base64
```
Copy the output.

### 6. Add 3 New GitHub Secrets
Go to: Repository → Settings → Secrets → Actions

| Secret Name | Value |
|-------------|-------|
| `MATCH_GIT_URL` | `https://github.com/YOUR_USERNAME/overtrain-certificates.git` |
| `MATCH_PASSWORD` | Your passphrase from step 3 |
| `MATCH_GIT_BASIC_AUTHORIZATION` | Base64 string from step 5 |

### 7. Run Workflow
```bash
git push origin main
```
Or manually trigger from GitHub Actions tab.

## Done! ✅

Your workflow should now succeed. Check TestFlight in 10-15 minutes.

---

For detailed instructions, see [FASTLANE_MATCH_SETUP.md](./FASTLANE_MATCH_SETUP.md)

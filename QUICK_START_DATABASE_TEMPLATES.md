# ⚡ Database Templates - Quick Start

**5-Minute Setup Guide**

---

## 1️⃣ Deploy Schema (2 min)

1. Open: https://supabase.com/dashboard
2. Click: **SQL Editor** → **New Query**
3. Paste: Contents of `program-templates-schema.sql`
4. Click: **Run** ▶️

✅ **Verify:** Tables created without errors

---

## 2️⃣ List Exercises (1 min)

```bash
npx tsx scripts/list-exercises.ts
```

📋 **Copy exact exercise names for next step**

---

## 3️⃣ Create Template (2 min)

```bash
# Edit TEMPLATE_DEFINITION in this file:
code scripts/create-template.ts

# Then run:
npx tsx scripts/create-template.ts
```

✅ **Success:** "Template created successfully"

---

## 4️⃣ Test in Browser (2 min)

```bash
npm run dev
```

1. Go to **Programs** tab
2. Find your template
3. Click "Start Program"
4. Go to **Train** tab
5. Start workout

✅ **Success:** Workout logger works!

---

## 🚀 What's Next?

### Migrate Existing Templates
```bash
npx tsx scripts/migrate-gym-templates.ts
```

### Read Full Docs
- **Overview:** `DATABASE_TEMPLATES_README.md`
- **Deployment:** `DEPLOY_TEMPLATES_GUIDE.md`
- **Testing:** `DATABASE_TEMPLATES_TEST_GUIDE.md`

---

## 💡 Quick Commands

```bash
# List exercises (all)
npx tsx scripts/list-exercises.ts

# List exercises (filtered)
npx tsx scripts/list-exercises.ts --muscle-group "Chest"
npx tsx scripts/list-exercises.ts --equipment "Barbell"

# Create template
npx tsx scripts/create-template.ts

# Migrate all templates
npx tsx scripts/migrate-gym-templates.ts

# Test performance (in browser console)
const { programTemplateService } = await import('./lib/services/program-template-service.js')
console.time('load')
await programTemplateService.getTemplate('your-id')
console.timeEnd('load')
```

---

## 🐛 Troubleshooting

### Templates not showing?
```javascript
// Browser console
const { programTemplateService } = await import('./lib/services/program-template-service.js')
await programTemplateService.getAllGymTemplates()
```

### Exercise not found?
```bash
# Find correct name
npx tsx scripts/list-exercises.ts | grep -i "exercise name"
```

### Clear cache
```javascript
// Browser console
const { programTemplateService } = await import('./lib/services/program-template-service.js')
programTemplateService.clearCache()
```

---

## ✅ Success Checklist

- [ ] Schema deployed to Supabase
- [ ] Can list exercises
- [ ] Created test template
- [ ] Template appears in UI
- [ ] Can start program
- [ ] Workout logger works
- [ ] Performance <50ms (cached)

---

**Need help?** See full documentation in repo root.

**Ready?** Start with step 1! 🚀


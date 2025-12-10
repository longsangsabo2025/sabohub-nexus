# ⚡ SABOHUB NEXUS - Quick Commands

## 🚀 Deployment Commands

```bash
# Preview deployment (testing)
.\deploy.ps1 -Preview

# Production deployment
.\deploy.ps1 -Production

# Manual Vercel CLI
vercel              # Preview
vercel --prod       # Production

# Build locally first
npm run build
npm run preview     # Test at http://localhost:4173
```

## 🛠️ Development Commands

```bash
# Start dev server
npm run dev         # http://localhost:9000

# Linting
npm run lint

# Testing
npm test           # Unit tests
npm run test:e2e   # E2E tests
npm run test:all   # All tests

# Build
npm run build      # Production build
npm run build:dev  # Development build
```

## 🔍 Verification Commands

```bash
# Check DNS
nslookup hub.saboarena.com

# Check SSL
curl -I https://hub.saboarena.com

# Check deployment
vercel ls          # List deployments
vercel inspect     # Inspect current deployment
```

## 📦 Quick Setup

```bash
# 1. Clone & Install
cd d:\0.PROJECTS\02-SABO-ECOSYSTEM\sabo-hub\sabohub-nexus
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your credentials

# 3. Test locally
npm run dev

# 4. Deploy
.\deploy.ps1 -Production
```

## 🔧 Troubleshooting

```bash
# Clear cache & rebuild
rm -rf node_modules dist .vercel
npm install
npm run build

# Check logs
vercel logs         # Production logs
vercel logs --follow # Real-time logs

# Rollback
# Go to Vercel Dashboard → Deployments → Previous → Promote
```

## 📋 Environment Variables

Set these in Vercel Dashboard → Settings → Environment Variables:

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
VITE_APP_NAME=SABOHUB
VITE_ENVIRONMENT=production
```

## 🌐 URLs

- **Production:** https://hub.saboarena.com
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Supabase Dashboard:** https://supabase.com/dashboard

## 🎯 Common Tasks

```bash
# Update dependencies
npm update

# Check for outdated packages
npm outdated

# Security audit
npm audit
npm audit fix

# Clean install
rm -rf node_modules package-lock.json
npm install
```

---

**Need help?** Check `DEPLOYMENT_GUIDE.md` for detailed instructions.

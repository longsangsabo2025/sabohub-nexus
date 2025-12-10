# 🚀 SABOHUB NEXUS - Production Deployment Guide

## 🎯 Deployment Target
**Domain:** `hub.saboarena.com`  
**Platform:** Vercel (Recommended)  
**Environment:** Production

---

## ⚡ QUICK DEPLOY - 5 Minutes

### Step 1: Install Vercel CLI (if not installed)
```bash
npm i -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Deploy from project directory
```bash
cd d:\0.PROJECTS\02-SABO-ECOSYSTEM\sabo-hub\sabohub-nexus
vercel --prod
```

---

## 🔧 Manual Setup (Recommended for Team)

### 1️⃣ **Vercel Dashboard Setup**

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import Git repository (recommended) OR upload folder
4. **Project Settings:**
   - **Framework Preset:** Vite
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

### 2️⃣ **Environment Variables (CRITICAL)**

Add these in Vercel Dashboard → Project → Settings → Environment Variables:

```env
# Supabase (REQUIRED)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Supabase Pooler (RECOMMENDED for production)
VITE_SUPABASE_POOLER_URL=https://aws-0-region.pooler.supabase.com

# App Config
VITE_APP_NAME=SABOHUB
VITE_APP_DESCRIPTION=Nền tảng quản lý thông minh cho doanh nghiệp dịch vụ
VITE_APP_VERSION=1.0.0
VITE_API_URL=https://hub.saboarena.com
VITE_ENVIRONMENT=production
VITE_DEBUG=false

# Analytics (Optional)
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
```

### 3️⃣ **Custom Domain Setup**

1. Go to **Project Settings** → **Domains**
2. Add domain: `hub.saboarena.com`
3. Vercel will provide DNS records:
   ```
   Type: CNAME
   Name: hub
   Value: cname.vercel-dns.com
   ```

### 4️⃣ **DNS Configuration**

In your domain provider (e.g., Cloudflare, GoDaddy):

**Option A: CNAME (Recommended)**
```
Type: CNAME
Name: hub
Target: cname.vercel-dns.com
Proxy: OFF (or DNS only)
TTL: Auto
```

**Option B: A Record**
```
Type: A
Name: hub
IPv4: 76.76.21.21
TTL: Auto
```

### 5️⃣ **Verify Deployment**

1. Wait 1-5 minutes for DNS propagation
2. Visit `https://hub.saboarena.com`
3. Test authentication flow
4. Check Supabase connection
5. Verify all features work

---

## 🏗️ Build & Test Locally First

```bash
# 1. Install dependencies
npm install

# 2. Build for production
npm run build

# 3. Preview production build
npm run preview

# 4. Open http://localhost:4173
```

---

## 🔐 Security Checklist

- ✅ Environment variables set in Vercel (NOT in code)
- ✅ HTTPS enabled (automatic with Vercel)
- ✅ CSP headers configured (in `vercel.json`)
- ✅ Supabase RLS policies enabled
- ✅ CORS configured for `hub.saboarena.com`
- ✅ X-Frame-Options set to SAMEORIGIN
- ✅ No sensitive data in client-side code

---

## 📊 Post-Deployment Monitoring

### Vercel Analytics
- Enable in Project Settings → Analytics
- Track Web Vitals, page views, errors

### Supabase Monitoring
- Database connections
- API usage
- Authentication logs

### Error Tracking (Optional)
- Sentry integration
- LogRocket for session replay
- Google Analytics for user behavior

---

## 🚨 Troubleshooting

### Issue: "Build Failed"
**Solution:**
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### Issue: "Environment Variables Not Working"
**Solution:**
- Variables MUST start with `VITE_` prefix
- Redeploy after adding variables in Vercel
- Check spelling and casing (case-sensitive)

### Issue: "Supabase Connection Failed"
**Solution:**
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Check Supabase project is active
- Verify API URL in Supabase dashboard

### Issue: "404 on Routes"
**Solution:**
- Already configured in `vercel.json` with rewrites
- All routes redirect to `/index.html` (SPA mode)

### Issue: "CORS Errors"
**Solution:**
- Check `vercel.json` headers configuration
- Verify Supabase CORS settings
- Update CSP to allow Supabase domains

---

## 🎛️ Alternative Deployment Options

### Option 2: Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod
```

### Option 3: Docker + DigitalOcean/AWS
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm install -g serve
CMD ["serve", "-s", "dist", "-l", "3000"]
```

### Option 4: GitHub Pages (Not Recommended)
- No server-side features
- No custom headers
- Only for static demos

---

## 📝 Deployment Checklist

Before going live:

- [ ] All environment variables set in Vercel
- [ ] Supabase project ready (production)
- [ ] Domain DNS configured
- [ ] SSL certificate active (auto by Vercel)
- [ ] Test login/logout flow
- [ ] Test all CRUD operations
- [ ] Mobile responsive check
- [ ] Performance audit (Lighthouse)
- [ ] Security headers verified
- [ ] Analytics tracking working
- [ ] Error monitoring setup
- [ ] Backup strategy in place
- [ ] Documentation updated
- [ ] Team access granted in Vercel

---

## 📞 Support

**Deployment Issues:**
- Check Vercel deployment logs
- Review browser console errors
- Check Supabase logs

**Domain Issues:**
- Verify DNS propagation: [dnschecker.org](https://dnschecker.org)
- Check Vercel domain settings
- Wait 24h for full DNS propagation

**Critical Bugs:**
- Roll back to previous deployment in Vercel dashboard
- Check GitHub commits
- Review error logs

---

## 🎉 Success Metrics

After deployment, monitor:
- **Uptime:** Should be 99.9%+ (Vercel SLA)
- **Load Time:** < 2 seconds (first load)
- **Error Rate:** < 0.1%
- **API Response Time:** < 500ms
- **User Satisfaction:** Manager feedback

---

**Deploy Fast. Deploy Right. No Bullshit.**  
*- The Musk Way 🚀*

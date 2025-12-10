# 🎯 DNS Configuration for hub.saboarena.com

## Quick Setup

### Option 1: CNAME Record (Recommended)
```
Type: CNAME
Name: hub
Target: cname.vercel-dns.com
TTL: Auto (or 3600)
Proxy Status: DNS Only (disable proxy if using Cloudflare)
```

### Option 2: A Record
```
Type: A
Name: hub
IPv4: 76.76.21.21
TTL: Auto
```

## Step-by-Step Instructions

### If using Cloudflare:
1. Log in to Cloudflare Dashboard
2. Select domain: `saboarena.com`
3. Go to **DNS** → **Records**
4. Click **Add record**
5. Fill in:
   - Type: `CNAME`
   - Name: `hub`
   - Target: `cname.vercel-dns.com`
   - Proxy status: **DNS only** (⚠️ Important!)
   - TTL: Auto
6. Click **Save**

### If using GoDaddy:
1. Log in to GoDaddy
2. Go to **My Products** → **Domains**
3. Click **DNS** next to saboarena.com
4. Click **Add** under Records
5. Fill in:
   - Type: `CNAME`
   - Name: `hub`
   - Value: `cname.vercel-dns.com`
   - TTL: 1 Hour
6. Click **Save**

### If using Namecheap:
1. Log in to Namecheap
2. Domain List → Manage for saboarena.com
3. Advanced DNS tab
4. Add New Record:
   - Type: `CNAME Record`
   - Host: `hub`
   - Value: `cname.vercel-dns.com`
   - TTL: Automatic
5. Save

## Verification

### Check DNS Propagation:
```bash
# PowerShell
nslookup hub.saboarena.com

# Or visit:
https://dnschecker.org/#CNAME/hub.saboarena.com
```

### Expected Result:
```
hub.saboarena.com → cname.vercel-dns.com → Vercel IP
```

## Timeline
- DNS changes take 5 mins - 24 hours to propagate
- Usually live within 15-30 minutes
- Full global propagation: up to 48 hours

## Troubleshooting

### Issue: "Domain not working"
**Solutions:**
1. Wait 30 minutes after DNS change
2. Clear browser cache (Ctrl+Shift+Delete)
3. Try incognito/private mode
4. Check DNS propagation status
5. Verify CNAME target is correct

### Issue: "SSL certificate pending"
**Solutions:**
- Vercel auto-generates SSL (1-10 mins)
- Check domain is verified in Vercel
- Wait for DNS propagation
- Force refresh SSL in Vercel dashboard

### Issue: "Too many redirects"
**Solutions:**
- Disable Cloudflare proxy (DNS only)
- Check vercel.json redirect rules
- Clear cookies and cache

## After DNS is Live

1. Visit https://hub.saboarena.com
2. Verify SSL certificate (🔒 padlock icon)
3. Test login functionality
4. Check all pages load correctly
5. Test on mobile devices
6. Share with manager for UAT

## Security Notes

- ✅ HTTPS enforced automatically
- ✅ SSL certificate auto-renewed
- ✅ DDoS protection via Vercel
- ✅ CDN enabled globally
- ✅ Headers configured for security

---

**Status:** Ready to configure  
**Estimated Setup Time:** 2-5 minutes  
**Propagation Time:** 15-30 minutes typically

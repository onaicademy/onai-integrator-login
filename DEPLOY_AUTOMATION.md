# 🤖 GitHub Actions Auto-Deploy Setup

## Automated Deployment to DigitalOcean

This project uses GitHub Actions to automatically deploy to DigitalOcean when code is pushed to the `main` branch.

---

## 🔐 Setup Instructions

### Step 1: Get Your SSH Private Key

You need the **private SSH key** that you use to connect to the server.

#### Option A: If you already have SSH key pair
```bash
# Display your private key
cat ~/.ssh/id_rsa

# OR if you use a different key
cat ~/.ssh/id_dsa
cat ~/.ssh/id_ed25519
```

#### Option B: Generate new SSH key pair (if needed)
```bash
# Generate new key
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_key

# Display private key
cat ~/.ssh/github_actions_key

# Copy public key to server
ssh-copy-id -i ~/.ssh/github_actions_key.pub root@178.128.203.40
```

### Step 2: Add SSH Key to GitHub Secrets

1. Go to your repository: https://github.com/onaicademy/onai-integrator-login
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add secret:
   - **Name**: `DO_SSH_KEY`
   - **Value**: Paste your **private SSH key** (entire content including `-----BEGIN` and `-----END`)

### Step 3: Verify Workflow File

The workflow file is located at: `.github/workflows/deploy.yml`

It will automatically run on every push to `main` branch.

---

## ✅ How It Works

### When you push to main:
```bash
git add .
git commit -m "Update something"
git push origin main
```

### GitHub Actions will:
1. ✅ Checkout repository
2. ✅ Set up Node.js 18
3. ✅ SSH to server (178.128.203.40)
4. ✅ Pull latest code
5. ✅ Install dependencies
6. ✅ Build production
7. ✅ Restart PM2
8. ✅ Show success message

### Deployment time: ~2-3 minutes

---

## 🔧 GitHub Actions Interface

### View Deployments
1. Go to: https://github.com/onaicademy/onai-integrator-login/actions
2. Click on any workflow run to see logs
3. Green checkmark = success ✅
4. Red X = failed ❌

### Test Deployment
After first push, check Actions tab:
```
✓ All checks have passed
✓ Deploy to DigitalOcean Droplet succeeded
```

---

## ⏸️ Pause Auto-Deploy

### Temporarily Disable Workflow

**Method 1: Via GitHub UI**
1. Go to: https://github.com/onaicademy/onai-integrator-login/actions
2. Click on **Deploy to DigitalOcean Droplet** workflow
3. Click **...** (three dots) → **Disable workflow**
4. Confirm by clicking **Disable workflow**

**Method 2: Via Settings**
1. Go to **Settings** → **Actions** → **General**
2. Scroll to **Workflow permissions**
3. Under **Actions**: Select **Disabled**

### Re-enable Workflow

**Via GitHub UI:**
1. Go to: https://github.com/onaicademy/onai-integrator-login/actions
2. Click on **Deploy to DigitalOcean Droplet** workflow
3. Click **Disable workflow** button (it will show "Enable workflow")
4. Click to enable

**Via Settings:**
1. Settings → Actions → General
2. Change workflow permissions back to **Read and write**

---

## 🐛 Troubleshooting

### Workflow Fails with SSH Error

**Check SSH Key:**
- Ensure `DO_SSH_KEY` secret is correctly set
- Private key should include headers (-----BEGIN...-----END)
- No extra spaces or line breaks

**Test SSH manually:**
```bash
ssh -i ~/.ssh/your_key root@178.128.203.40
```

### Workflow Fails with Permission Error

**On server:**
```bash
# Check git permissions
cd /var/www/onai-integrator-login
sudo chown -R root:root .
git config --global --add safe.directory /var/www/onai-integrator-login

# Check PM2 permissions
pm2 startup systemd -u root --hp /root
```

### Build Fails on Server

**Check logs in GitHub Actions:**
1. Click on failed workflow run
2. Expand "Deploy to Droplet via SSH" step
3. Check error messages

**Common issues:**
- Missing `.env` file → Create it on server
- npm install fails → Check disk space
- Node version mismatch → Update Node.js on server

---

## 📊 Monitoring

### View Recent Deployments

GitHub Actions tab: https://github.com/onaicademy/onai-integrator-login/actions

### Check Server Logs

```bash
ssh root@178.128.203.40
cd /var/www/onai-integrator-login

# Check PM2 logs
pm2 logs onai-app

# Check PM2 status
pm2 list
pm2 info onai-app
```

### Check Deployment Time

Look at workflow run duration in Actions tab.

---

## 🔒 Security Notes

1. **Never commit SSH keys** to repository
2. **Use GitHub Secrets** for sensitive data
3. **Rotate keys periodically**
4. **Review Actions logs** for suspicious activity
5. **Limit who can merge to main**

---

## 📝 Manual Deployment (If Needed)

If auto-deploy is disabled, deploy manually:

```bash
ssh root@178.128.203.40
cd /var/www/onai-integrator-login
git pull origin main
npm install
npm run build
pm2 restart onai-app
```

---

## ✅ Success Criteria

After setting up:

1. ✅ Push to `main` triggers deployment
2. ✅ GitHub Actions shows green checkmark
3. ✅ Site updates automatically
4. ✅ PM2 app is running
5. ✅ No manual intervention needed

---

**🎉 After setup, every `git push` will automatically deploy to https://onaiacademy.kz!**


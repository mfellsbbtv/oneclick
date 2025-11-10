# WSL2 Localhost Access Fix

## Current Situation
- ✅ **Working:** http://172.26.133.188:3000/quick-provision
- ❌ **Not Working:** http://localhost:3000/quick-provision

## Why This Happens
WSL2 uses a virtualized network adapter, and Windows sometimes can't forward `localhost` requests to WSL2 properly.

---

## Solutions (Try in Order)

### Solution 1: Port Forwarding Script (Recommended)
Create a PowerShell script to forward ports automatically.

**Run in Windows PowerShell as Administrator:**

```powershell
# Get WSL IP address
$wslIp = (wsl hostname -I).trim()
Write-Host "WSL IP: $wslIp"

# Remove existing port forwarding (if any)
netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=0.0.0.0

# Add port forwarding
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=$wslIp

# Show current port forwarding rules
netsh interface portproxy show v4tov4

Write-Host "`nPort forwarding set up successfully!"
Write-Host "You can now access: http://localhost:3000"
```

**To remove later:**
```powershell
netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=0.0.0.0
```

---

### Solution 2: Windows Firewall Rule
Add a firewall rule to allow WSL connections.

**Run in Windows PowerShell as Administrator:**

```powershell
New-NetFirewallRule -DisplayName "WSL Port 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

---

### Solution 3: Update .wslconfig
Configure WSL2 to use localhost forwarding.

**Create/Edit:** `C:\Users\<YourUsername>\.wslconfig`

```ini
[wsl2]
localhostForwarding=true
networkingMode=mirrored
```

**Then restart WSL:**
```powershell
wsl --shutdown
```

Then restart your terminal and the dev server.

---

### Solution 4: Use NEXT_PUBLIC_APP_URL
Update your environment to use the WSL IP.

**In .env:**
```bash
NEXT_PUBLIC_APP_URL=http://172.26.133.188:3000
```

**Restart the frontend:**
```bash
cd /home/mfells/Projects/oneclick/frontend
npm run dev
```

---

## Quick Test
After applying any solution, test with:

```bash
# From Windows browser
http://localhost:3000/quick-provision

# From PowerShell
curl http://localhost:3000
```

---

## Current Working URL
**Bookmark this for now:**
- http://172.26.133.188:3000/quick-provision

⚠️ **Note:** The WSL IP (172.26.133.188) may change after Windows restarts. If the site stops working, run:

```bash
# In WSL
hostname -I | awk '{print $1}'
```

---

## Permanent Solution (Best)
Use Solution 3 (.wslconfig with mirrored networking) for a permanent fix. This is available in Windows 11 22H2 or later.

---

## Alternative: Access from WSL Browser
If you have a Linux GUI installed in WSL:

```bash
# Install Firefox in WSL (if needed)
sudo apt update && sudo apt install firefox

# Open browser
firefox http://localhost:3000/quick-provision &
```

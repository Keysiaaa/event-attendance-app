const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const cloudflaredPath = 'C:\\Users\\Pongo\\.gemini\\antigravity\\scratch\\cloudflared.exe';
const tunnelLogFile = path.join(__dirname, 'data', 'active-tunnel.txt');

let currentUrl = null;
let pingInterval = null;
let currentProc = null;

function startTunnel() {
  console.log('[Tunnel Runner] Starting Cloudflare tunnel with persistent keep-alive...');
  
  currentProc = spawn(cloudflaredPath, [
    'tunnel',
    '--url', 'http://localhost:5000'
  ], {
    windowsHide: true
  });

  currentProc.stdout.on('data', handleOutput);
  currentProc.stderr.on('data', handleOutput);

  currentProc.on('close', (code) => {
    console.warn(`[Tunnel Runner] Tunnel process exited with code ${code}. Reconnecting in 2 seconds...`);
    if (pingInterval) clearInterval(pingInterval);
    setTimeout(startTunnel, 2000);
  });
}

function handleOutput(data) {
  const text = data.toString();
  process.stdout.write(text);

  // If Cloudflare expired the quick tunnel session, kill process to trigger auto-restart!
  if (text.includes('Unauthorized: Tunnel not found') || 
      text.includes('Error shutting down control stream') ||
      text.includes('failed to dial to edge with quic: timeout')) {
    console.warn('\n[Tunnel Runner] Cloudflare session expired or dropped. Killing process to generate fresh tunnel...');
    if (currentProc) {
      try {
        currentProc.kill('SIGKILL');
      } catch (e) {}
    }
    return;
  }

  // Match https://*.trycloudflare.com
  const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
  if (match && match[0] && match[0] !== currentUrl) {
    currentUrl = match[0];
    console.log(`\n======================================================`);
    console.log(`>>> TUNNEL ACTIVE: ${currentUrl}`);
    console.log(`======================================================\n`);

    try {
      fs.writeFileSync(tunnelLogFile, currentUrl, 'utf8');
    } catch (e) {}

    // Setup keep-alive ping every 25 seconds with proper stream consumption
    if (pingInterval) clearInterval(pingInterval);
    pingInterval = setInterval(() => {
      if (currentUrl) {
        https.get(`${currentUrl}/api/health`, (res) => {
          // MUST consume response body to release socket back to pool
          res.resume();
        }).on('error', () => {});
      }
    }, 25000);
  }
}

startTunnel();

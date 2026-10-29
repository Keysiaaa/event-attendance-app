const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const cloudflaredPath = 'C:\\Users\\Pongo\\.gemini\\antigravity\\scratch\\cloudflared.exe';
const tunnelLogFile = path.join(__dirname, 'data', 'active-tunnel.txt');

let currentUrl = null;
let pingInterval = null;

function startTunnel() {
  console.log('[Tunnel Runner] Starting Cloudflare tunnel with HTTP/2 persistent connection...');
  
  const proc = spawn(cloudflaredPath, [
    'tunnel',
    '--protocol', 'http2',
    '--url', 'http://localhost:5000'
  ], {
    windowsHide: true
  });

  proc.stdout.on('data', handleOutput);
  proc.stderr.on('data', handleOutput);

  proc.on('close', (code) => {
    console.warn(`[Tunnel Runner] Tunnel process exited with code ${code}. Reconnecting in 3 seconds...`);
    if (pingInterval) clearInterval(pingInterval);
    setTimeout(startTunnel, 3000);
  });
}

function handleOutput(data) {
  const text = data.toString();
  process.stdout.write(text);

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

    // Setup keep-alive ping every 30 seconds to prevent idle timeout
    if (pingInterval) clearInterval(pingInterval);
    pingInterval = setInterval(() => {
      if (currentUrl) {
        https.get(`${currentUrl}/api/health`, (res) => {
          // Keep-alive OK
        }).on('error', () => {});
      }
    }, 30000);
  }
}

startTunnel();

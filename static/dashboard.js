const MAX_POINTS = 40;
const histories = { cpu: [], memory: [], disk: [] };

function clamp(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function setProgress(id, value) {
  document.getElementById(id).style.width = `${clamp(value)}%`;
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds) || 0);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function pushHistory(key, value) {
  histories[key].push(clamp(value));
  if (histories[key].length > MAX_POINTS) histories[key].shift();
}

function drawChart(canvasId, values) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(126, 140, 168, .18)';
  ctx.lineWidth = 1;
  for (let y = 0; y <= 4; y++) {
    const py = (height - 10) * y / 4 + 5;
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(width, py);
    ctx.stroke();
  }

  if (values.length < 2) return;

  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, '#4d7cff');
  gradient.addColorStop(1, '#41d6a3');
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();

  values.forEach((value, index) => {
    const x = (index / (MAX_POINTS - 1)) * width;
    const y = height - 8 - (value / 100) * (height - 16);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function setConnection(ok, text) {
  const dot = document.getElementById('statusDot');
  dot.classList.toggle('ok', ok);
  dot.classList.toggle('error', !ok);
  document.getElementById('statusText').textContent = text;
}

async function refreshMetrics() {
  try {
    const response = await fetch('/api/metrics', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    const cpu = data.cpu.usage_percent;
    const memory = data.memory.usage_percent;
    const disk = data.disk.usage_percent;

    document.getElementById('hostname').textContent = data.host.hostname;
    document.getElementById('processCount').textContent = data.host.process_count;
    document.getElementById('cpuCount').textContent = data.host.cpu_count_logical ?? '—';
    document.getElementById('uptime').textContent = formatDuration(data.host.uptime_seconds);

    document.getElementById('cpuValue').textContent = `${cpu.toFixed(1)}%`;
    document.getElementById('memoryValue').textContent = `${memory.toFixed(1)}%`;
    document.getElementById('diskValue').textContent = `${disk.toFixed(1)}%`;

    setProgress('cpuBar', cpu);
    setProgress('memoryBar', memory);
    setProgress('diskBar', disk);

    const load = data.host.load_average;
    document.getElementById('loadAverage').textContent =
      load['1m'] === null ? 'Load average: not available' : `Load average: ${load['1m']} / ${load['5m']} / ${load['15m']}`;
    document.getElementById('memoryDetail').textContent = `${data.memory.used_human} used of ${data.memory.total_human}`;
    document.getElementById('diskDetail').textContent = `${data.disk.used_human} used · ${data.disk.free_human} free`;
    document.getElementById('networkSent').textContent = data.network.sent_human;
    document.getElementById('networkReceived').textContent = data.network.received_human;
    document.getElementById('lastUpdated').textContent = new Date(data.timestamp).toLocaleTimeString();

    pushHistory('cpu', cpu);
    pushHistory('memory', memory);
    pushHistory('disk', disk);
    drawChart('cpuChart', histories.cpu);
    drawChart('memoryChart', histories.memory);
    drawChart('diskChart', histories.disk);

    setConnection(true, 'Live');
  } catch (error) {
    console.error(error);
    setConnection(false, 'Disconnected');
  }
}

refreshMetrics();
setInterval(refreshMetrics, 2000);

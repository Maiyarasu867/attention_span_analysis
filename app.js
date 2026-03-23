import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

let db = null, intervalId = null, isStreaming = false;
let totalWindows = 0, currentSpeed = 2000;

// Update Sliders
const inputs = ['hrv_t', 'hrv_p', 'mov_t', 'mov_p', 'noi_t', 'noi_p', 'lig_t', 'lig_p'];
inputs.forEach(id => {
    const el = document.getElementById(id);
    el.oninput = () => document.getElementById('disp_' + id).innerText = el.value;
});

// Speed Control
document.querySelectorAll('.btn-speed').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.btn-speed').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSpeed = parseInt(btn.getAttribute('data-ms'));
        if (isStreaming) { stopStream(); startStream(); }
    };
});

// Firebase Connect
document.getElementById('btnConnect').onclick = () => {
    const config = {
        apiKey: document.getElementById('apiKey').value,
        databaseURL: document.getElementById('databaseURL').value,
        projectId: document.getElementById('projectId').value,
    };
    try {
        const app = initializeApp(config);
        db = getDatabase(app);
        document.getElementById('btnToggle').disabled = false;
        document.getElementById('connBadge').innerText = "Online";
        document.getElementById('connBadge').className = "badge rounded-pill bg-success";
        log("Connection Secure.");
    } catch (e) { log("Error: Check Config"); }
};

function getVal(threshold, prob, min, max, isInt = false) {
    const isHigh = Math.random() < (prob / 100);
    let val = isHigh ? threshold + (Math.random() * (max - threshold)) : min + (Math.random() * (threshold - min));
    val += (Math.random() - 0.5) * (max - min) * 0.02; // Jitter
    val = Math.max(min, Math.min(max, val));
    return isInt ? Math.round(val) : parseFloat(val.toFixed(4));
}

function generateFrame() {
    const payload = {
        hrv: getVal(parseFloat(hrv_t.value), parseFloat(hrv_p.value), 25, 80),
        movement_var: getVal(parseFloat(mov_t.value), parseFloat(mov_p.value), 0.04, 0.82),
        noise_spikes: getVal(parseInt(noi_t.value), parseFloat(noi_p.value), 0, 6, true),
        light_var: getVal(parseFloat(lig_t.value), parseFloat(lig_p.value), 0.01, 0.40),
        timestamp: Date.now()
    };
    set(ref(db, 'sensor_stream'), payload);
    totalWindows++;
    document.getElementById('winCount').innerText = `Total: ${totalWindows}`;
    updateTable(payload);
}

function updateTable(d) {
    const tb = document.getElementById('tableBody');
    if (totalWindows === 1) tb.innerHTML = "";
    const hrvH = d.hrv > parseFloat(hrv_t.value);
    const row = `<tr>
        <td style="color:var(--accent-amber)">${d.hrv.toFixed(1)}</td>
        <td>${d.movement_var.toFixed(3)}</td>
        <td>${d.noise_spikes}</td>
        <td>${d.light_var.toFixed(2)}</td>
        <td><span class="badge badge-status" style="color:${hrvH?'#3fb950':'#d29922'}; border-color:${hrvH?'#3fb950':'#d29922'}">${hrvH?'HIGH':'LOW'}</span></td>
    </tr>`;
    tb.insertAdjacentHTML('afterbegin', row);
    if (tb.children.length > 7) tb.removeChild(tb.lastChild);
}

function startStream() { intervalId = setInterval(generateFrame, currentSpeed); isStreaming = true; log(`Broadcasting @ ${currentSpeed}ms`); }
function stopStream() { clearInterval(intervalId); isStreaming = false; }

document.getElementById('btnToggle').onclick = () => {
    const btn = document.getElementById('btnToggle');
    if (!isStreaming) {
        startStream();
        btn.innerText = "STOP BROADCAST";
        btn.className = "btn btn-danger w-100 fw-bold py-2 mb-3";
    } else {
        stopStream();
        btn.innerText = "START STREAM";
        btn.className = "btn btn-success w-100 fw-bold py-2 mb-3";
        log("Broadcast Halted.");
    }
};

function log(m) {
    const c = document.getElementById('logConsole');
    c.innerHTML = `<div>> ${m}</div>` + c.innerHTML;
}
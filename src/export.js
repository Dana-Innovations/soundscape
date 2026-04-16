import { state } from './state.js';
import { ui } from './ui.js';
import { canvas } from './canvas.js';

export function downloadPNG() {
    const mult = parseInt(ui.resMultiplier.value);
    const showBgExport = state.bgImage && !state.hideBg;
    const tc = document.createElement('canvas');
    tc.width = state.W * mult;
    tc.height = state.H * mult;
    const tctx = tc.getContext('2d');
    tctx.scale(mult, mult);
    if (showBgExport) {
        const scale = Math.max(state.W / state.bgImage.width, state.H / state.bgImage.height);
        tctx.drawImage(
            state.bgImage,
            (state.W - state.bgImage.width * scale) / 2,
            (state.H - state.bgImage.height * scale) / 2,
            state.bgImage.width * scale,
            state.bgImage.height * scale
        );
        if (parseFloat(ui.bgDimmer.value) > 0) {
            tctx.fillStyle = `rgba(0,0,0,${ui.bgDimmer.value})`;
            tctx.fillRect(0, 0, state.W, state.H);
        }
        tctx.globalCompositeOperation = 'screen';
    }
    state.sources.forEach(s => s.draw(tctx, performance.now() / 1000, true));
    const link = document.createElement('a');
    link.download = `soundscape_${Date.now()}.png`;
    link.href = tc.toDataURL('image/png');
    link.click();
}

export function startRecording() {
    const mimeTypes = ['video/mp4', 'video/webm;codecs=h264', 'video/webm'];
    const mimeType = mimeTypes.find(t => MediaRecorder.isTypeSupported(t)) || '';
    if (!mimeType) { alert('Recording not supported'); return; }
    const stream = canvas.captureStream(60);
    state.mediaRecorder = new MediaRecorder(stream, { mimeType });
    state.recordedChunks = [];
    state.mediaRecorder.ondataavailable = e => { if (e.data.size > 0) state.recordedChunks.push(e.data); };
    state.mediaRecorder.onstop = () => {
        const blob = new Blob(state.recordedChunks, { type: mimeType });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `soundscape_${Date.now()}.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`;
        a.click();
    };
    state.mediaRecorder.start();
    state.isRecording = true;
    ui.recordBtn.textContent = 'Stop Recording';
    ui.recordBtn.classList.add('recording');
}

export function stopRecording() {
    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
        state.mediaRecorder.stop();
        state.isRecording = false;
        ui.recordBtn.textContent = 'Record Video';
        ui.recordBtn.classList.remove('recording');
    }
}

export async function exportPNGSequence() {
    const mult = parseInt(ui.resMultiplier.value);
    const fps = 30, duration = 8, totalFrames = fps * duration;
    const startTime = performance.now() / 1000;
    ui.exportSequence.disabled = true;
    ui.exportSequence.textContent = 'Exporting...';
    ui.exportProgress.style.display = 'block';
    const tc = document.createElement('canvas');
    tc.width = state.W * mult;
    tc.height = state.H * mult;
    const tctx = tc.getContext('2d');
    const frames = [];

    for (let frame = 0; frame < totalFrames; frame++) {
        const t = startTime + frame / fps;
        tctx.save();
        tctx.scale(mult, mult);
        tctx.clearRect(0, 0, state.W, state.H);
        if (state.bgImage && !state.hideBg) {
            const scale = Math.max(state.W / state.bgImage.width, state.H / state.bgImage.height);
            tctx.drawImage(
                state.bgImage,
                (state.W - state.bgImage.width * scale) / 2,
                (state.H - state.bgImage.height * scale) / 2,
                state.bgImage.width * scale,
                state.bgImage.height * scale
            );
            if (parseFloat(ui.bgDimmer.value) > 0) {
                tctx.fillStyle = `rgba(0,0,0,${ui.bgDimmer.value})`;
                tctx.fillRect(0, 0, state.W, state.H);
            }
            tctx.globalCompositeOperation = 'screen';
        }
        state.sources.forEach(s => s.draw(tctx, t, true));
        tctx.restore();
        const blob = await new Promise(r => tc.toBlob(r, 'image/png'));
        frames.push({ name: `frame_${String(frame).padStart(4, '0')}.png`, blob });
        ui.progressBar.style.width = `${(frame + 1) / totalFrames * 100}%`;
        ui.progressText.textContent = `${frame + 1} / ${totalFrames}`;
        await new Promise(r => setTimeout(r, 0));
    }

    ui.progressText.textContent = 'Creating ZIP...';
    const zipBlob = await createZip(frames);
    const link = document.createElement('a');
    link.download = `soundscape_sequence_${Date.now()}.zip`;
    link.href = URL.createObjectURL(zipBlob);
    link.click();
    ui.exportSequence.disabled = false;
    ui.exportSequence.textContent = 'Export PNG Sequence (8s)';
    ui.exportProgress.style.display = 'none';
}

async function createZip(files) {
    const crc32Table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        crc32Table[i] = c;
    }
    const crc32 = data => {
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < data.length; i++) crc = crc32Table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
        return (crc ^ 0xFFFFFFFF) >>> 0;
    };
    const dosTime = d => ({
        time: (d.getSeconds() >> 1) | (d.getMinutes() << 5) | (d.getHours() << 11),
        date: d.getDate() | ((d.getMonth() + 1) << 5) | ((d.getFullYear() - 1980) << 9),
    });
    const localHeaders = [], centralHeaders = [];
    let offset = 0;
    const dt = dosTime(new Date());

    for (const file of files) {
        const data = new Uint8Array(await file.blob.arrayBuffer());
        const nameBytes = new TextEncoder().encode(file.name);
        const crc = crc32(data);
        const local = new Uint8Array(30 + nameBytes.length + data.length);
        const lv = new DataView(local.buffer);
        lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(8, 0, true);
        lv.setUint16(10, dt.time, true); lv.setUint16(12, dt.date, true);
        lv.setUint32(14, crc, true); lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true);
        lv.setUint16(26, nameBytes.length, true);
        local.set(nameBytes, 30); local.set(data, 30 + nameBytes.length);
        localHeaders.push(local);
        const central = new Uint8Array(46 + nameBytes.length);
        const cv = new DataView(central.buffer);
        cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
        cv.setUint16(12, dt.time, true); cv.setUint16(14, dt.date, true);
        cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true);
        cv.setUint16(28, nameBytes.length, true); cv.setUint32(42, offset, true);
        central.set(nameBytes, 46);
        centralHeaders.push(central);
        offset += local.length;
    }

    const centralSize = centralHeaders.reduce((s, c) => s + c.length, 0);
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralSize, true); ev.setUint32(16, offset, true);
    return new Blob([...localHeaders, ...centralHeaders, eocd], { type: 'application/zip' });
}

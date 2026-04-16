import { state, applyToSelected } from './state.js';
import { SoundSource } from './SoundSource.js';
import { saveState, undo, redo, onSave } from './history.js';
import { ui, uiPanel, updateUIState, updateUndoRedoButtons, resize, togglePanel } from './ui.js';
import { canvas } from './canvas.js';
import { animate } from './renderer.js';
import { handleStart, handleMove, handleEnd, duplicateSelected, deleteSelected, selectAll } from './input.js';
import { saveScene, loadScene } from './scene.js';
import { downloadPNG, startRecording, stopRecording, exportPNGSequence } from './export.js';
import { hexToHsl } from './utils.js';

// Wire history → UI button state
onSave(updateUndoRedoButtons);

// Keyboard shortcuts
window.addEventListener('keydown', e => {
    if (document.activeElement === ui.coneHex) return;
    const k = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === 'z') { e.preventDefault(); e.shiftKey ? redo(updateUIState) : undo(updateUIState); return; }
    if ((e.metaKey || e.ctrlKey) && k === 'y') { e.preventDefault(); redo(updateUIState); return; }
    if (k === 'h') togglePanel();
    if (k === 'r') state.showHandles = !state.showHandles;
    if (k === 'd') duplicateSelected();
    if (k === 'a' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); selectAll(); }
    if (k === 'escape') { state.selectedCones.clear(); updateUIState(); }
    if (k === 'backspace' || k === 'delete') { if (state.selectedCones.size > 0) { e.preventDefault(); deleteSelected(); } }
});

// Canvas interactions
canvas.addEventListener('mousedown', e => handleStart(e.clientX, e.clientY, e));
canvas.addEventListener('touchstart', e => { if (handleStart(e.touches[0].clientX, e.touches[0].clientY, e)) e.preventDefault(); }, { passive: false });
canvas.addEventListener('touchmove', e => { handleMove(e.touches[0].clientX, e.touches[0].clientY, null); if (state.mouse.isDown) e.preventDefault(); }, { passive: false });
canvas.addEventListener('touchend', handleEnd);

window.addEventListener('mousemove', e => {
    handleMove(e.clientX, e.clientY, e);
    if (state.panelDrag.active) {
        state.panelDrag.panelX = Math.max(0, Math.min(state.W - 300, e.clientX - state.panelDrag.startX));
        state.panelDrag.panelY = Math.max(0, Math.min(state.H - 100, e.clientY - state.panelDrag.startY));
        uiPanel.style.left = state.panelDrag.panelX + 'px';
        uiPanel.style.top = state.panelDrag.panelY + 'px';
    }
});
window.addEventListener('mouseup', () => { handleEnd(); state.panelDrag.active = false; });
window.addEventListener('resize', resize);

// Panel drag
ui.panelHeader.addEventListener('mousedown', e => {
    if (e.target === ui.shortcutsBtn || e.target === ui.hideBtn || ui.shortcutsDropdown.contains(e.target)) return;
    state.panelDrag.active = true;
    state.panelDrag.startX = e.clientX - state.panelDrag.panelX;
    state.panelDrag.startY = e.clientY - state.panelDrag.panelY;
    e.preventDefault();
});

// Panel buttons
ui.hideBtn.addEventListener('click', e => { e.stopPropagation(); togglePanel(); });
ui.shortcutsBtn.addEventListener('click', e => { e.stopPropagation(); ui.shortcutsDropdown.classList.toggle('visible'); });
document.addEventListener('click', e => { if (!ui.shortcutsDropdown.contains(e.target) && e.target !== ui.shortcutsBtn) ui.shortcutsDropdown.classList.remove('visible'); });

// Undo/redo
ui.undoBtn.addEventListener('click', () => undo(updateUIState));
ui.redoBtn.addEventListener('click', () => redo(updateUIState));

// Source management
document.getElementById('add-source').addEventListener('click', () => {
    const ns = new SoundSource(state.W / 2, state.H / 2);
    state.sources.push(ns);
    state.selectedCones.clear();
    state.selectedCones.add(ns);
    saveState();
    updateUIState();
});
ui.cloneLast.addEventListener('click', duplicateSelected);
document.getElementById('clear-sources').addEventListener('click', () => {
    state.sources.length = 0;
    state.selectedCones.clear();
    state.lastSelectedCone = null;
    saveState();
    updateUIState();
});

// Resolution multiplier
ui.resMultiplier.addEventListener('input', () => {
    ui.valResMult.textContent = ui.resMultiplier.value;
    ui.valResSize.textContent = `${state.W * parseInt(ui.resMultiplier.value)}x${state.H * parseInt(ui.resMultiplier.value)}`;
});

// Scene
ui.saveScene.addEventListener('click', saveScene);
ui.loadSceneBtn.addEventListener('click', () => ui.loadSceneInput.click());
ui.loadSceneInput.addEventListener('change', loadScene);

// Export / record
ui.recordBtn.addEventListener('click', () => state.isRecording ? stopRecording() : startRecording());
ui.downloadPng.addEventListener('click', downloadPNG);
ui.exportSequence.addEventListener('click', exportPNGSequence);
ui.selectAllBtn.addEventListener('click', selectAll);

// Background image
ui.bgImageInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = ev => {
            const img = new Image();
            img.onload = () => state.bgImage = img;
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    }
});
ui.hideBg.addEventListener('change', e => state.hideBg = e.target.checked);

// Cone sliders
const sliderHandler = (el, prop, valEl, parse = parseInt) => {
    el.addEventListener('input', e => {
        applyToSelected(c => c[prop] = parse(e.target.value));
        if (valEl) valEl.textContent = e.target.value;
        updateUIState();
    });
    el.addEventListener('change', saveState);
};
sliderHandler(ui.spread, 'spread', ui.valSpread);
sliderHandler(ui.distance, 'distance', ui.valDist);
sliderHandler(ui.speed, 'speed', null, parseFloat);
sliderHandler(ui.waveThickness, 'waveThickness');
sliderHandler(ui.intensity, 'intensity', null, parseFloat);
sliderHandler(ui.fresnelBright, 'fresnelBright', null, parseFloat);
sliderHandler(ui.softness, 'softness', null, parseFloat);

ui.invertGradient.addEventListener('change', e => { applyToSelected(c => c.invertGradient = e.target.checked); saveState(); });

// Color controls
ui.coneHue.addEventListener('input', () => { applyToSelected(c => { c.hue = parseInt(ui.coneHue.value); c.saturation = parseInt(ui.coneSat.value); }); updateUIState(); });
ui.coneHue.addEventListener('change', saveState);
ui.coneSat.addEventListener('input', () => { applyToSelected(c => { c.hue = parseInt(ui.coneHue.value); c.saturation = parseInt(ui.coneSat.value); }); updateUIState(); });
ui.coneSat.addEventListener('change', saveState);
ui.coneHex.addEventListener('input', e => {
    const hsl = hexToHsl(e.target.value);
    if (hsl) { applyToSelected(c => { c.hue = hsl.h; c.saturation = hsl.s; }); ui.coneHue.value = hsl.h; ui.coneSat.value = hsl.s; updateUIState(); }
});
ui.coneHex.addEventListener('change', saveState);

// Clone / delete
ui.cloneBtn.addEventListener('click', duplicateSelected);
ui.deleteBtn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); deleteSelected(); });

// Init
resize();
const initialSource = new SoundSource(state.W * 0.5, state.H * 0.5);
initialSource.angle = -Math.PI / 2;
state.sources.push(initialSource);
saveState();
updateUIState();
requestAnimationFrame(animate);

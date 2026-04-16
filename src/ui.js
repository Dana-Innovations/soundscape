import { state } from './state.js';
import { saveState } from './history.js';
import { hslToHex } from './utils.js';
import { canvas } from './canvas.js';

const $ = id => document.getElementById(id);

export const uiPanel = $('ui-panel');

export const ui = {
    spread: $('spread'), distance: $('distance'), speed: $('speed'), waveThickness: $('wave-thickness'),
    intensity: $('intensity'), fresnelBright: $('fresnel-bright'), softness: $('softness'),
    invertGradient: $('invert-gradient'), valSpread: $('val-spread'), valDist: $('val-dist'),
    bgImageInput: $('bg-image-input'), bgDimmer: $('bg-dimmer'), hideBg: $('hide-bg'),
    coneSettings: $('cone-settings'), selectionLabel: $('selection-label'),
    coneHue: $('cone-hue'), coneSat: $('cone-sat'), coneHex: $('cone-hex'),
    cloneBtn: $('clone-btn'), deleteBtn: $('delete-btn'), hideBtn: $('hide-btn'),
    shortcutsBtn: $('shortcuts-btn'), shortcutsDropdown: $('shortcuts-dropdown'),
    cloneLast: $('clone-last'), saveScene: $('save-scene'), loadSceneBtn: $('load-scene-btn'),
    loadSceneInput: $('load-scene-input'), recordBtn: $('record-btn'), downloadPng: $('download-png'),
    exportSequence: $('export-sequence'), exportProgress: $('export-progress'),
    progressBar: $('progress-bar'), progressText: $('progress-text'),
    resMultiplier: $('res-multiplier'), valResMult: $('val-res-mult'), valResSize: $('val-res-size'),
    selectAllBtn: $('select-all-btn'), undoBtn: $('undo-btn'), redoBtn: $('redo-btn'),
    panelHeader: $('panel-header'),
    selectionBar: $('selection-bar'), selectionDots: $('selection-dots'),
    selectionCount: $('selection-count'),
};

export function updateUndoRedoButtons() {
    ui.undoBtn.disabled = state.undoStack.length <= 1;
    ui.redoBtn.disabled = state.redoStack.length === 0;
}

export function updateSelectionBar() {
    if (state.selectedCones.size > 1) {
        ui.selectionBar.classList.add('visible');
        ui.selectionCount.textContent = `${state.selectedCones.size} selected`;
        ui.selectionDots.innerHTML = '';
        state.selectedCones.forEach(c => {
            const d = document.createElement('div');
            d.className = 'selection-dot';
            d.style.backgroundColor = d.style.color = `hsl(${c.hue}, ${c.saturation}%, 50%)`;
            ui.selectionDots.appendChild(d);
        });
    } else {
        ui.selectionBar.classList.remove('visible');
    }
}

export function updateOffscreenIndicators() {
    state.offscreenIndicators.forEach(el => el.remove());
    state.offscreenIndicators = [];
    if (state.panelHidden) return;
    state.sources.forEach(source => {
        if (!source.isOffscreen()) return;
        const ind = document.createElement('div');
        ind.className = 'offscreen-indicator';
        ind.style.backgroundColor = `hsl(${source.hue}, ${source.saturation}%, 40%)`;
        ind.style.color = `hsl(${source.hue}, ${source.saturation}%, 60%)`;
        ind.innerHTML = '&#9679;';
        const margin = 40;
        const x = Math.max(margin, Math.min(state.W - margin, source.x));
        const y = Math.max(margin, Math.min(state.H - margin, source.y));
        ind.style.left = `${x - 14}px`;
        ind.style.top = `${y - 14}px`;
        ind.onclick = () => {
            source.x = state.W / 2;
            source.y = state.H / 2;
            state.selectedCones.clear();
            state.selectedCones.add(source);
            saveState();
            updateUIState();
        };
        document.body.appendChild(ind);
        state.offscreenIndicators.push(ind);
    });
}

export function updateUIState() {
    updateSelectionBar();
    updateOffscreenIndicators();
    if (state.selectedCones.size > 0) {
        const f = Array.from(state.selectedCones)[0];
        state.lastSelectedCone = f;
        ui.coneSettings.style.display = 'block';
        ui.selectionLabel.textContent = state.selectedCones.size > 1 ? `${state.selectedCones.size} Cones` : 'Cone';
        ui.spread.value = f.spread;
        ui.valSpread.textContent = f.spread;
        ui.distance.value = f.distance;
        ui.valDist.textContent = f.distance;
        ui.speed.value = f.speed;
        ui.waveThickness.value = f.waveThickness;
        ui.intensity.value = f.intensity;
        ui.fresnelBright.value = f.fresnelBright;
        ui.softness.value = f.softness;
        ui.invertGradient.checked = f.invertGradient;
        ui.coneHue.value = f.hue;
        ui.coneSat.value = f.saturation;
        ui.coneHex.value = hslToHex(f.hue, f.saturation, 50);
        ui.coneHue.style.background = `linear-gradient(to right, hsl(0,${f.saturation}%,50%), hsl(60,${f.saturation}%,50%), hsl(120,${f.saturation}%,50%), hsl(180,${f.saturation}%,50%), hsl(240,${f.saturation}%,50%), hsl(300,${f.saturation}%,50%), hsl(360,${f.saturation}%,50%))`;
        ui.coneSat.style.background = `linear-gradient(to right, hsl(${f.hue},0%,50%), hsl(${f.hue},100%,50%))`;
    } else {
        ui.coneSettings.style.display = 'none';
    }
}

export function resize() {
    const oldW = state.W || window.innerWidth;
    const oldH = state.H || window.innerHeight;
    state.W = canvas.width = window.innerWidth;
    state.H = canvas.height = window.innerHeight;
    if (oldW && oldH && state.sources.length > 0) {
        state.sources.forEach(s => { s.x *= state.W / oldW; s.y *= state.H / oldH; });
    }
    ui.valResSize.textContent = `${state.W * parseInt(ui.resMultiplier.value)}x${state.H * parseInt(ui.resMultiplier.value)}`;
}

export function togglePanel() {
    state.panelHidden = !state.panelHidden;
    uiPanel.style.display = state.panelHidden ? 'none' : 'block';
    updateOffscreenIndicators();
}

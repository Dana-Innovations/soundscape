import { state, serializeState, applyToSelected } from './state.js';
import { SoundSource } from './SoundSource.js';
import { saveState } from './history.js';
import { ui, updateUIState, updateOffscreenIndicators } from './ui.js';
import { canvas } from './canvas.js';

export function duplicateSelected() {
    const toDup = state.selectedCones.size > 0
        ? Array.from(state.selectedCones)
        : (state.lastSelectedCone
            ? [state.lastSelectedCone]
            : (state.sources.length > 0 ? [state.sources[state.sources.length - 1]] : []));
    if (toDup.length === 0) return;
    const newCones = toDup.map((s, i) => {
        const ns = new SoundSource(s.x + 30 + i * 10, s.y + 30 + i * 10);
        ns.copyPropertiesFrom(s);
        state.sources.push(ns);
        return ns;
    });
    state.selectedCones.clear();
    newCones.forEach(c => state.selectedCones.add(c));
    saveState();
    updateUIState();
}

export function deleteSelected() {
    if (state.selectedCones.size === 0) return;
    state.selectedCones.forEach(c => {
        const i = state.sources.indexOf(c);
        if (i > -1) state.sources.splice(i, 1);
    });
    state.selectedCones.clear();
    saveState();
    updateUIState();
}

export function selectAll() {
    state.selectedCones.clear();
    state.sources.forEach(s => state.selectedCones.add(s));
    updateUIState();
}

export function handleStart(x, y, e) {
    const rect = canvas.getBoundingClientRect();
    const mx = x - rect.left;
    const my = y - rect.top;
    state.mouse.startState = null;

    if (e.metaKey || e.altKey) {
        const ns = new SoundSource(mx, my);
        state.sources.push(ns);
        state.selectedCones.clear();
        state.selectedCones.add(ns);
        state.mouse.dragTarget = ns;
        state.mouse.dragType = 'move';
        state.mouse.isDown = true;
        saveState();
        updateUIState();
        return true;
    }

    let hitCone = null, hitType = null;
    for (let i = state.sources.length - 1; i >= 0; i--) {
        const t = state.sources[i].hitTest(mx, my);
        if (t) { hitCone = state.sources[i]; hitType = t; break; }
    }

    if (hitCone) {
        state.mouse.startState = serializeState();
        if (e.shiftKey && hitType !== 'rotate') {
            if (state.selectedCones.has(hitCone)) state.selectedCones.delete(hitCone);
            else state.selectedCones.add(hitCone);
        } else if (!e.shiftKey && hitType !== 'rotate' && !state.selectedCones.has(hitCone)) {
            state.selectedCones.clear();
            state.selectedCones.add(hitCone);
        } else if (hitType === 'rotate' && !state.selectedCones.has(hitCone)) {
            state.selectedCones.clear();
            state.selectedCones.add(hitCone);
        }
        state.mouse.dragTarget = hitCone;
        state.mouse.dragType = hitType;
        state.mouse.isDown = true;
        state.mouse.shiftKey = e.shiftKey;
        state.mouse.startDist = Math.hypot(mx - hitCone.x, my - hitCone.y);
        state.mouse.startDistance = hitCone.distance;
        updateUIState();
        return true;
    } else if (!e.shiftKey) {
        state.selectedCones.clear();
        updateUIState();
    }
    return false;
}

export function handleMove(x, y, e) {
    if (!state.mouse.isDown || !state.mouse.dragTarget) return;
    const rect = canvas.getBoundingClientRect();
    const mx = x - rect.left;
    const my = y - rect.top;
    if (state.mouse.dragType === 'move') {
        const dx = mx - state.mouse.dragTarget.x;
        const dy = my - state.mouse.dragTarget.y;
        state.selectedCones.forEach(c => { c.x += dx; c.y += dy; });
        state.mouse.dragTarget.x = mx;
        state.mouse.dragTarget.y = my;
    } else if (state.mouse.dragType === 'rotate') {
        if (state.mouse.shiftKey || (e && e.shiftKey)) {
            const dx = mx - state.mouse.dragTarget.x;
            const dy = my - state.mouse.dragTarget.y;
            const proj = dx * Math.cos(state.mouse.dragTarget.angle) + dy * Math.sin(state.mouse.dragTarget.angle);
            const newDist = Math.max(100, Math.min(800, state.mouse.startDistance + proj - state.mouse.startDist));
            applyToSelected(c => c.distance = Math.round(newDist));
            ui.distance.value = Math.round(newDist);
            ui.valDist.textContent = Math.round(newDist);
        } else {
            const newAngle = Math.atan2(my - state.mouse.dragTarget.y, mx - state.mouse.dragTarget.x);
            const delta = newAngle - state.mouse.dragTarget.angle;
            state.selectedCones.forEach(c => c.angle += delta);
            state.mouse.dragTarget.angle = newAngle;
        }
    }
    updateOffscreenIndicators();
}

export function handleEnd() {
    if (state.mouse.isDown && state.mouse.startState && serializeState() !== state.mouse.startState) {
        saveState();
    }
    state.mouse.isDown = false;
    state.mouse.dragTarget = null;
    state.mouse.startState = null;
}

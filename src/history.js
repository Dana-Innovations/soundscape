import { state, serializeState } from './state.js';
import { SoundSource } from './SoundSource.js';

let _onSave = null;

export function onSave(fn) {
    _onSave = fn;
}

export function deserializeState(snapshot) {
    const data = JSON.parse(snapshot);
    state.sources.length = 0;
    data.sources.forEach(s => {
        const ns = new SoundSource(s.x, s.y);
        Object.assign(ns, s);
        state.sources.push(ns);
    });
    state.selectedCones.clear();
    data.selectedIds.forEach(id => {
        const c = state.sources.find(s => s.id === id);
        if (c) state.selectedCones.add(c);
    });
    state.lastSelectedCone = state.selectedCones.size > 0
        ? Array.from(state.selectedCones)[0]
        : (state.sources.length > 0 ? state.sources[state.sources.length - 1] : null);
}

export function saveState() {
    const snapshot = serializeState();
    if (state.undoStack.length === 0 || state.undoStack[state.undoStack.length - 1] !== snapshot) {
        state.undoStack.push(snapshot);
        if (state.undoStack.length > state.MAX_HISTORY) state.undoStack.shift();
        state.redoStack.length = 0;
        if (_onSave) _onSave();
    }
}

export function undo(onRestore) {
    if (state.undoStack.length <= 1) return;
    state.redoStack.push(state.undoStack.pop());
    deserializeState(state.undoStack[state.undoStack.length - 1]);
    if (onRestore) onRestore();
    if (_onSave) _onSave();
}

export function redo(onRestore) {
    if (state.redoStack.length === 0) return;
    state.undoStack.push(state.redoStack.pop());
    deserializeState(state.undoStack[state.undoStack.length - 1]);
    if (onRestore) onRestore();
    if (_onSave) _onSave();
}

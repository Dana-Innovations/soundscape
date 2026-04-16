export const state = {
    sources: [],
    bgImage: null,
    selectedCones: new Set(),
    lastSelectedCone: null,
    showHandles: true,
    hideBg: false,
    panelHidden: false,
    W: 0,
    H: 0,
    offscreenIndicators: [],
    panelDrag: { active: false, startX: 0, startY: 0, panelX: 20, panelY: 20 },
    undoStack: [],
    redoStack: [],
    MAX_HISTORY: 50,
    mediaRecorder: null,
    recordedChunks: [],
    isRecording: false,
    mouse: {
        x: 0, y: 0, isDown: false, dragTarget: null, dragType: null,
        shiftKey: false, startDist: 0, startDistance: 0, startState: null,
    },
};

export function serializeState() {
    return JSON.stringify({
        sources: state.sources.map(s => ({
            id: s.id, x: s.x, y: s.y, angle: s.angle, phase: s.phase,
            spread: s.spread, distance: s.distance, speed: s.speed,
            waveThickness: s.waveThickness, intensity: s.intensity,
            fresnelBright: s.fresnelBright, softness: s.softness,
            invertGradient: s.invertGradient, hue: s.hue, saturation: s.saturation,
        })),
        selectedIds: Array.from(state.selectedCones).map(c => c.id),
    });
}

export function applyToSelected(cb) {
    state.selectedCones.forEach(c => cb(c));
}

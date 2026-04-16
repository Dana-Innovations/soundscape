import { state } from './state.js';
import { SoundSource } from './SoundSource.js';
import { saveState } from './history.js';
import { ui, updateUIState } from './ui.js';

export function saveScene() {
    const scene = {
        settings: { bgDimmer: ui.bgDimmer.value, hideBg: ui.hideBg.checked },
        sources: state.sources.map(s => ({
            id: s.id, x: s.x / state.W, y: s.y / state.H, angle: s.angle, phase: s.phase,
            spread: s.spread, distance: s.distance, speed: s.speed, waveThickness: s.waveThickness,
            intensity: s.intensity, fresnelBright: s.fresnelBright, softness: s.softness,
            invertGradient: s.invertGradient, hue: s.hue, saturation: s.saturation,
        })),
    };
    const blob = new Blob([JSON.stringify(scene, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `soundscape_${Date.now()}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
}

export function loadScene(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        try {
            const scene = JSON.parse(ev.target.result);
            if (scene.settings) {
                ui.bgDimmer.value = scene.settings.bgDimmer;
                ui.hideBg.checked = scene.settings.hideBg;
                state.hideBg = scene.settings.hideBg;
            }
            if (scene.sources) {
                state.sources.length = 0;
                scene.sources.forEach(s => {
                    const ns = new SoundSource(s.x * state.W, s.y * state.H);
                    Object.assign(ns, s);
                    ns.x = s.x * state.W;
                    ns.y = s.y * state.H;
                    state.sources.push(ns);
                });
            }
            state.selectedCones.clear();
            state.lastSelectedCone = state.sources.length > 0 ? state.sources[state.sources.length - 1] : null;
            saveState();
            updateUIState();
        } catch {
            alert('Error loading scene');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

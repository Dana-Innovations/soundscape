import { state } from './state.js';

export class SoundSource {
    constructor(x, y) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.x = x;
        this.y = y;
        this.angle = Math.random() * Math.PI * 2;
        this.spread = 60;
        this.distance = 450;
        this.speed = 0.3;
        this.waveThickness = 100;
        this.intensity = 1.0;
        this.fresnelBright = 1.0;
        this.softness = 0.2;
        this.invertGradient = false;
        this.hue = Math.floor(Math.random() * 360);
        this.saturation = 100;
        this.phase = Math.random() * Math.PI * 2;
    }

    copyPropertiesFrom(s) {
        this.spread = s.spread;
        this.distance = s.distance;
        this.speed = s.speed;
        this.waveThickness = s.waveThickness;
        this.intensity = s.intensity;
        this.fresnelBright = s.fresnelBright;
        this.softness = s.softness;
        this.invertGradient = s.invertGradient;
        this.hue = s.hue;
        this.saturation = s.saturation;
        this.angle = s.angle;
        this.phase = Math.random() * Math.PI * 2;
    }

    isOffscreen() {
        return this.x < -20 || this.x > state.W + 20 || this.y < -20 || this.y > state.H + 20;
    }

    draw(c, time, forExport = false) {
        const { selectedCones, panelHidden, showHandles } = state;
        const spreadRad = (this.spread * Math.PI) / 180;
        const maxDist = this.distance;
        const bandWidth = this.waveThickness;
        const isFullCircle = this.spread >= 360;
        const startAngle = this.angle - spreadRad / 2;
        const endAngle = this.angle + spreadRad / 2;

        const fieldGrad = c.createRadialGradient(this.x, this.y, 0, this.x, this.y, maxDist);
        fieldGrad.addColorStop(0, `hsla(${this.hue}, ${this.saturation}%, 60%, ${0.15 * this.intensity})`);
        fieldGrad.addColorStop(Math.max(0.8, 1 - this.softness * 0.5), `hsla(${this.hue}, ${this.saturation}%, 50%, 0)`);
        fieldGrad.addColorStop(1, `hsla(${this.hue}, ${this.saturation}%, 50%, 0)`);

        c.save();
        c.beginPath();
        if (isFullCircle) {
            c.arc(this.x, this.y, maxDist, 0, Math.PI * 2);
        } else {
            c.moveTo(this.x, this.y);
            c.arc(this.x, this.y, maxDist, startAngle, endAngle);
            c.closePath();
        }
        c.fillStyle = fieldGrad;
        c.fill();
        if (!isFullCircle) {
            c.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, 80%, ${0.1 * this.intensity * (1 - this.softness * 0.8)})`;
            c.lineWidth = 1;
            c.stroke();
        }
        c.clip();

        for (let i = 0; i < 6; i++) {
            const normalizedPos = ((time * this.speed * 0.5 + this.phase / (Math.PI * 2) + i / 6) % 1);
            const dist = normalizedPos * (maxDist + bandWidth);
            if (dist > 0 && dist - bandWidth < maxDist) {
                const g = c.createRadialGradient(this.x, this.y, Math.max(0, dist - bandWidth), this.x, this.y, dist);
                const distFactor = 1 - Math.min(1, dist / maxDist);
                const fade = distFactor * distFactor;
                const alpha = fade * this.intensity;
                const bodyStop = 0.5 - this.softness * 0.3;
                const rimStop = 0.95 - this.softness * 0.15;
                const rimSat = Math.max(0, this.saturation - 40);
                if (this.invertGradient) {
                    g.addColorStop(0, `hsla(${this.hue}, ${this.saturation}%, 50%, 0)`);
                    g.addColorStop(bodyStop, `hsla(${this.hue}, ${rimSat}%, 30%, ${alpha * 0.5})`);
                    g.addColorStop(rimStop, `hsla(${this.hue}, ${this.saturation}%, 95%, ${Math.min(1, alpha * this.fresnelBright)})`);
                    g.addColorStop(1, `hsla(${this.hue}, ${this.saturation}%, 50%, 0)`);
                } else {
                    g.addColorStop(0, `hsla(${this.hue}, ${this.saturation}%, 50%, 0)`);
                    g.addColorStop(bodyStop, `hsla(${this.hue}, ${this.saturation}%, 60%, ${alpha * 0.3})`);
                    g.addColorStop(rimStop, `hsla(${this.hue}, ${rimSat}%, 95%, ${Math.min(1, alpha * this.fresnelBright)})`);
                    g.addColorStop(1, `hsla(${this.hue}, ${this.saturation}%, 50%, 0)`);
                }
                c.fillStyle = g;
                c.beginPath();
                c.arc(this.x, this.y, dist, 0, Math.PI * 2);
                c.arc(this.x, this.y, Math.max(0, dist - bandWidth), 0, Math.PI * 2, true);
                c.fill();
            }
        }
        c.restore();

        if (!forExport && selectedCones.has(this) && !panelHidden) {
            c.beginPath();
            c.arc(this.x, this.y, 16, 0, Math.PI * 2);
            c.strokeStyle = selectedCones.size > 1 ? 'rgba(100, 200, 255, 0.8)' : 'rgba(255, 255, 255, 0.6)';
            c.lineWidth = selectedCones.size > 1 ? 2 : 1;
            c.setLineDash([4, 3]);
            c.stroke();
            c.setLineDash([]);
        }

        const coreGrad = c.createRadialGradient(this.x, this.y, 0, this.x, this.y, 10);
        coreGrad.addColorStop(0, '#fff');
        coreGrad.addColorStop(1, `hsla(${this.hue}, ${this.saturation}%, 50%, 0.8)`);
        c.fillStyle = coreGrad;
        c.beginPath();
        c.arc(this.x, this.y, 8, 0, Math.PI * 2);
        c.fill();

        if (!forExport && showHandles) {
            const hx = this.x + Math.cos(this.angle) * 50;
            const hy = this.y + Math.sin(this.angle) * 50;
            c.beginPath();
            c.moveTo(this.x, this.y);
            c.lineTo(hx, hy);
            c.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, 80%, 0.3)`;
            c.lineWidth = 1;
            c.setLineDash([2, 2]);
            c.stroke();
            c.setLineDash([]);
            c.beginPath();
            c.arc(hx, hy, 4, 0, Math.PI * 2);
            c.fillStyle = `hsla(${this.hue}, ${this.saturation}%, 90%, 0.9)`;
            c.fill();
        }
    }

    hitTest(mx, my) {
        if (Math.hypot(mx - this.x, my - this.y) < 20) return 'move';
        if (state.showHandles) {
            const hx = this.x + Math.cos(this.angle) * 50;
            const hy = this.y + Math.sin(this.angle) * 50;
            if (Math.hypot(mx - hx, my - hy) < 15) return 'rotate';
        }
        return null;
    }
}

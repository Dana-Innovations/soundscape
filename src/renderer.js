import { state } from './state.js';
import { ui } from './ui.js';
import { canvas, ctx } from './canvas.js';

export { canvas, ctx };

export function animate(time) {
    if (state.bgImage && !state.hideBg) {
        const scale = Math.max(state.W / state.bgImage.width, state.H / state.bgImage.height);
        ctx.drawImage(
            state.bgImage,
            (state.W - state.bgImage.width * scale) / 2,
            (state.H - state.bgImage.height * scale) / 2,
            state.bgImage.width * scale,
            state.bgImage.height * scale
        );
        if (parseFloat(ui.bgDimmer.value) > 0) {
            ctx.fillStyle = `rgba(0,0,0,${ui.bgDimmer.value})`;
            ctx.fillRect(0, 0, state.W, state.H);
        }
    } else {
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, state.W, state.H);
    }
    ctx.globalCompositeOperation = 'screen';
    state.sources.forEach(s => s.draw(ctx, time / 1000, false));
    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(animate);
}

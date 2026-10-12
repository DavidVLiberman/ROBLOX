// Keyboard / mouse / touch input, Roblox default control scheme.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();      // keys pressed this frame
    this.mouseDX = 0; this.mouseDY = 0; this.wheel = 0;
    this.dragging = false;
    this.mouseX = 0; this.mouseY = 0;
    this.clicked = false;
    this.shiftLock = false;
    this.touch = { joy: null, joyX: 0, joyY: 0, look: null, jump: false, pinch: null };
    this.lastActivity = performance.now();
    this.enabled = true;

    addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      const k = e.key.toLowerCase();
      if (!this.keys.has(k)) this.pressed.add(k);
      this.keys.add(k);
      this.lastActivity = performance.now();
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
      if (k === 'shift' && !e.repeat) this.toggleShiftLock();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('mousedown', (e) => {
      this.lastActivity = performance.now();
      this.downAt = { x: e.clientX, y: e.clientY, t: performance.now(), button: e.button };
      this.dragging = true;
    });
    addEventListener('mouseup', (e) => {
      if (this.downAt && e.button === 0) {
        const moved = Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y);
        if (moved < 6) { this.clicked = true; this.clickX = e.clientX; this.clickY = e.clientY; }
      }
      this.dragging = false; this.downAt = null;
    });
    addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX; this.mouseY = e.clientY;
      if (document.pointerLockElement === canvas) { this.mouseDX += e.movementX; this.mouseDY += e.movementY; }
      else if (this.dragging) { this.mouseDX += e.movementX; this.mouseDY += e.movementY; }
    });
    canvas.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement !== canvas && this.shiftLock) this.shiftLock = false;
    });

    // ---- touch ----
    canvas.addEventListener('touchstart', (e) => this.onTouch(e, 'start'), { passive: false });
    canvas.addEventListener('touchmove', (e) => this.onTouch(e, 'move'), { passive: false });
    canvas.addEventListener('touchend', (e) => this.onTouch(e, 'end'), { passive: false });
    canvas.addEventListener('touchcancel', (e) => this.onTouch(e, 'end'), { passive: false });
  }

  toggleShiftLock() {
    if (this.isTouch) return;
    this.shiftLock = !this.shiftLock;
    if (this.shiftLock) this.canvas.requestPointerLock?.();
    else if (document.pointerLockElement) document.exitPointerLock();
  }

  onTouch(e, phase) {
    e.preventDefault();
    this.isTouch = true;
    this.lastActivity = performance.now();
    const t = this.touch;
    for (const tc of e.changedTouches) {
      const id = tc.identifier;
      if (phase === 'start') {
        if (tc.clientX < innerWidth * 0.4 && tc.clientY > innerHeight * 0.4 && !t.joy) {
          t.joy = { id, x: tc.clientX, y: tc.clientY };
          this.showJoy?.(tc.clientX, tc.clientY, 0, 0);
        } else if (!t.look) {
          t.look = { id, x: tc.clientX, y: tc.clientY, sx: tc.clientX, sy: tc.clientY, t: performance.now() };
        } else if (!t.pinch) {
          t.pinch = { id, x: tc.clientX, y: tc.clientY, d: Math.hypot(tc.clientX - t.look.x, tc.clientY - t.look.y) };
        }
      } else if (phase === 'move') {
        if (t.joy && t.joy.id === id) {
          let dx = tc.clientX - t.joy.x, dy = tc.clientY - t.joy.y;
          const len = Math.hypot(dx, dy), max = 50;
          if (len > max) { dx = dx / len * max; dy = dy / len * max; }
          t.joyX = dx / max; t.joyY = dy / max;
          this.showJoy?.(t.joy.x, t.joy.y, dx, dy);
        } else if (t.pinch && (t.pinch.id === id || (t.look && t.look.id === id))) {
          if (t.pinch.id === id) { t.pinch.x = tc.clientX; t.pinch.y = tc.clientY; } else { t.look.x = tc.clientX; t.look.y = tc.clientY; }
          const d = Math.hypot(t.pinch.x - t.look.x, t.pinch.y - t.look.y);
          this.wheel += (t.pinch.d - d) * 0.05;
          t.pinch.d = d;
        } else if (t.look && t.look.id === id) {
          this.mouseDX += (tc.clientX - t.look.x) * 1.2;
          this.mouseDY += (tc.clientY - t.look.y) * 1.2;
          t.look.x = tc.clientX; t.look.y = tc.clientY;
        }
      } else {
        if (t.joy && t.joy.id === id) { t.joy = null; t.joyX = t.joyY = 0; this.showJoy?.(null); }
        else if (t.look && t.look.id === id) {
          if (Math.hypot(tc.clientX - t.look.sx, tc.clientY - t.look.sy) < 8 && performance.now() - t.look.t < 300) {
            this.clicked = true; this.clickX = tc.clientX; this.clickY = tc.clientY;
          }
          t.look = null; t.pinch = null;
        } else if (t.pinch && t.pinch.id === id) t.pinch = null;
      }
    }
  }

  down(...ks) { return ks.some(k => this.keys.has(k)); }
  wasPressed(k) { return this.pressed.has(k); }

  // forward/right in camera space, -1..1
  moveAxes() {
    let f = 0, r = 0;
    if (this.down('w', 'arrowup')) f += 1;
    if (this.down('s', 'arrowdown')) f -= 1;
    if (this.down('d')) r += 1;
    if (this.down('a')) r -= 1;
    if (this.touch.joy) { f = -this.touch.joyY; r = this.touch.joyX; }
    return { f, r };
  }

  jumpHeld() { return this.down(' ') || this.touch.jump; }

  endFrame() {
    this.pressed.clear();
    this.mouseDX = this.mouseDY = 0;
    this.wheel = 0;
    this.clicked = false;
  }
}

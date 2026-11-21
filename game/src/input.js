// Velvet Shadow — keyboard and mouse input.
// WASD or arrows move, Shift sneaks (slow and quiet), hold nothing to walk,
// double-tap a direction... no: hold Shift+move to run is backwards, so the
// keys are: Shift = sneak, Space = run (loud, fast). Click tosses a pebble
// toward the mouse. R restarts, P pauses, M mutes, Enter starts.
export function makeInput(canvas) {
  const keys = new Set();
  const mouse = { x: 0, y: 0, clicked: false, clickX: 0, clickY: 0 };
  let onKey = null; // callback for single-press actions (start, restart...)
  let onClick = null; // callback for a canvas click (pebble toss)

  const KEYMAP = {
    ArrowUp: 'up',
    KeyW: 'up',
    ArrowDown: 'down',
    KeyS: 'down',
    ArrowLeft: 'left',
    KeyA: 'left',
    ArrowRight: 'right',
    KeyD: 'right',
    ShiftLeft: 'sneak',
    ShiftRight: 'sneak',
    Space: 'run',
  };

  function canvasPos(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    const action = KEYMAP[event.code];
    if (action) keys.add(action);
    if (onKey && !event.repeat) onKey(event.code, event);
  });

  window.addEventListener('keyup', (event) => {
    const action = KEYMAP[event.code];
    if (action) keys.delete(action);
  });

  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (event) => {
    const p = canvasPos(event);
    mouse.x = p.x;
    mouse.y = p.y;
  });

  canvas.addEventListener('mousedown', (event) => {
    const p = canvasPos(event);
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.clicked = true;
    mouse.clickX = p.x;
    mouse.clickY = p.y;
    if (onClick) onClick(p.x, p.y);
  });

  return {
    keys,
    mouse,
    setKeyHandler(fn) {
      onKey = fn;
    },
    setClickHandler(fn) {
      onClick = fn;
    },
    // Movement vector from the keys held down right now.
    moveVector() {
      let dx = 0;
      let dy = 0;
      if (keys.has('left')) dx -= 1;
      if (keys.has('right')) dx += 1;
      if (keys.has('up')) dy -= 1;
      if (keys.has('down')) dy += 1;
      return { dx, dy };
    },
    get sneaking() {
      return keys.has('sneak');
    },
    get running() {
      return keys.has('run');
    },
  };
}

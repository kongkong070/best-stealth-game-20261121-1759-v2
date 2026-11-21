// Velvet Shadow — keyboard and mouse input.
// Mouse coordinates are translated into the canvas's own 960x640 space so
// pebble throws land where the player clicked, whatever the window size.
export function createInput(canvas) {
  const input = {
    keys: new Set(),
    mouse: { x: 0, y: 0 },
    clicked: false,
    pressed: new Set(), // keys pressed since the last frame, edge-triggered
  };

  function toCanvas(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (!e.repeat) input.pressed.add(e.code);
    input.keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => input.keys.delete(e.code));
  window.addEventListener('blur', () => input.keys.clear());

  canvas.addEventListener('mousemove', (e) => {
    input.mouse = toCanvas(e.clientX, e.clientY);
  });
  canvas.addEventListener('mousedown', (e) => {
    input.mouse = toCanvas(e.clientX, e.clientY);
    input.clicked = true;
  });

  input.endFrame = () => {
    input.pressed.clear();
    input.clicked = false;
  };

  return input;
}

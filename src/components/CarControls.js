const BINDINGS = {
  KeyW: 'throttle',
  ArrowUp: 'throttle',
  KeyS: 'brake',
  ArrowDown: 'brake',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  Space: 'handbrake',
};

const BLOCKED_DEFAULT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);

/**
 * Keyboard input for a single car. `read()` returns normalised axes so the
 * physics step never has to care which physical key produced them.
 */
export class CarControls {
  constructor() {
    this.keys = { throttle: false, brake: false, left: false, right: false, handbrake: false };
    this.enabled = true;
    this.attached = false;
    this.target = null;

    this.handleKeyDown = (event) => {
      const action = BINDINGS[event.code];
      if (!action) return;
      if (BLOCKED_DEFAULT.has(event.code)) event.preventDefault();
      if (event.repeat) return;
      this.keys[action] = true;
    };

    this.handleKeyUp = (event) => {
      const action = BINDINGS[event.code];
      if (!action) return;
      this.keys[action] = false;
    };

    this.handleBlur = () => this.clear();
  }

  attach(target = window) {
    if (this.attached) this.detach();
    this.target = target;
    target.addEventListener('keydown', this.handleKeyDown);
    target.addEventListener('keyup', this.handleKeyUp);
    target.addEventListener('blur', this.handleBlur);
    this.attached = true;
    return this;
  }

  detach() {
    if (!this.attached || !this.target) return;
    this.target.removeEventListener('keydown', this.handleKeyDown);
    this.target.removeEventListener('keyup', this.handleKeyUp);
    this.target.removeEventListener('blur', this.handleBlur);
    this.attached = false;
    this.target = null;
  }

  clear() {
    this.keys.throttle = false;
    this.keys.brake = false;
    this.keys.left = false;
    this.keys.right = false;
    this.keys.handbrake = false;
  }

  read(out = {}) {
    const active = this.enabled;
    const keys = this.keys;
    out.throttle = active ? (keys.throttle ? 1 : 0) - (keys.brake ? 1 : 0) : 0;
    // Positive steer turns the car to the driver's left (see CarPhysics).
    out.steer = active ? (keys.left ? 1 : 0) - (keys.right ? 1 : 0) : 0;
    out.handbrake = active && keys.handbrake;
    out.anyKey = keys.throttle || keys.brake || keys.left || keys.right || keys.handbrake;
    return out;
  }
}

export default CarControls;

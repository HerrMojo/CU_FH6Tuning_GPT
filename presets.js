/* Forza Tune App - shared presets and utility helpers */
(function () {
  const FT = (window.ForzaTune = window.ForzaTune || {});

  FT.CLASS_INDEX = {
    D: 0,
    C: 1,
    B: 2,
    A: 3,
    S1: 4,
    S2: 5,
    X: 6,
  };

  FT.CLASS_LABELS = Object.keys(FT.CLASS_INDEX);

  FT.SURFACE_PRESETS = {
    pavement: {
      label: 'Pavement',
      grip: 1.0,
      softness: 0.25,
      pressureDrop: 0,
      rideHeight: 0.22,
      note: 'Low, sharp, and planted for clean asphalt grip.',
    },
    mixed: {
      label: 'Mixed',
      grip: 0.82,
      softness: 0.55,
      pressureDrop: 1.8,
      rideHeight: 0.52,
      note: 'More compliance for broken pavement, dirt shoulders, and sketchy transitions.',
    },
    offroad: {
      label: 'Offroad',
      grip: 0.66,
      softness: 0.85,
      pressureDrop: 5.5,
      rideHeight: 0.82,
      note: 'Softer and taller so bumps do not punt the car into orbit.',
    },
  };

  FT.RACE_PRESETS = {
    grip: {
      label: 'Grip',
      firstGearPercent: 0.24,
      pressureBias: 0,
      camberBias: 1,
      diffAggression: 0.62,
      note: 'Balanced corner speed with predictable throttle behavior.',
    },
    drift: {
      label: 'Drift',
      firstGearPercent: 0.33,
      pressureBias: 2.8,
      camberBias: 1.75,
      diffAggression: 0.95,
      note: 'Front bite, rear rotation, and fewer shifts mid-slide.',
    },
    drag: {
      label: 'Drag',
      firstGearPercent: 0.21,
      pressureBias: -1.5,
      camberBias: 0.18,
      diffAggression: 1,
      note: 'Launch grip and clean pull through the traps.',
    },
  };

  FT.DEFAULT_TOP_SPEEDS = {
    D: { grip: { pavement: 110, mixed: 100, offroad: 90 }, drag: 125, drift: 90 },
    C: { grip: { pavement: 130, mixed: 115, offroad: 100 }, drag: 145, drift: 105 },
    B: { grip: { pavement: 155, mixed: 135, offroad: 120 }, drag: 175, drift: 125 },
    A: { grip: { pavement: 180, mixed: 155, offroad: 140 }, drag: 210, drift: 145 },
    S1: { grip: { pavement: 210, mixed: 180, offroad: 160 }, drag: 245, drift: 165 },
    S2: { grip: { pavement: 245, mixed: 205, offroad: 180 }, drag: 285, drift: 185 },
    X: { grip: { pavement: 275, mixed: 225, offroad: 195 }, drag: 310, drift: 200 },
  };

  FT.ROUTE_SPEED_MODIFIERS = {
    technical: 0.9,
    balanced: 1,
    highspeed: 1.12,
  };

  FT.TIRE_COMPOUND_MODIFIERS = {
    stock: { grip: 0.9, pressure: 0.8, label: 'Stock' },
    street: { grip: 0.95, pressure: 0.4, label: 'Street' },
    sport: { grip: 1, pressure: 0, label: 'Sport' },
    race: { grip: 1.06, pressure: -0.3, label: 'Race' },
    drag: { grip: 1.04, pressure: -1.2, label: 'Drag' },
    rally: { grip: 0.98, pressure: -2.3, label: 'Rally' },
    offroad: { grip: 0.96, pressure: -3.2, label: 'Offroad' },
  };

  FT.DRIVETRAIN_PRESETS = {
    FWD: { label: 'FWD', frontPower: 1, rearPower: 0 },
    RWD: { label: 'RWD', frontPower: 0, rearPower: 1 },
    AWD: { label: 'AWD', frontPower: 0.45, rearPower: 0.55 },
  };

  FT.clamp = function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number(value)));
  };

  FT.round = function round(value, decimals = 1) {
    const factor = Math.pow(10, decimals);
    return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
  };

  FT.lerp = function lerp(min, max, t) {
    return min + (max - min) * FT.clamp(t, 0, 1);
  };

  FT.formatSigned = function formatSigned(value, decimals = 1) {
    const rounded = FT.round(value, decimals);
    return rounded > 0 ? `+${rounded}` : `${rounded}`;
  };

  FT.getClassFactor = function getClassFactor(carClass) {
    const idx = FT.CLASS_INDEX[carClass] ?? 3;
    return idx / 6;
  };

  FT.getDefaultTopSpeed = function getDefaultTopSpeed(carClass, raceType, surface, routeStyle = 'balanced') {
    const table = FT.DEFAULT_TOP_SPEEDS[carClass] || FT.DEFAULT_TOP_SPEEDS.A;
    let speed;
    if (raceType === 'grip') {
      speed = table.grip[surface] ?? table.grip.pavement;
    } else {
      speed = table[raceType] ?? table.grip.pavement;
    }
    return Math.round(speed * (FT.ROUTE_SPEED_MODIFIERS[routeStyle] || 1));
  };
})();

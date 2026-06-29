/* FH6GPT Tune Lab - tuning calculations */
(function () {
  const FT = (window.ForzaTune = window.ForzaTune || {});

  function ratioLabel(ratio) {
    if (ratio < 0.25) return 'soft / low';
    if (ratio < 0.45) return 'medium-soft';
    if (ratio < 0.65) return 'medium';
    if (ratio < 0.82) return 'medium-stiff';
    return 'stiff / high';
  }

  function buildTires(ctx) {
    const { raceType, surfacePreset, compoundPreset, drivetrain, weightDistribution, classFactor, horsepower, handlingPreset } = ctx;
    let front = 28.5;
    let rear = 28.0;

    front -= surfacePreset.pressureDrop;
    rear -= surfacePreset.pressureDrop;
    front += compoundPreset.pressure;
    rear += compoundPreset.pressure;

    if (raceType === 'grip') {
      front += FT.lerp(-0.2, 1.1, classFactor);
      rear += FT.lerp(-0.4, 0.8, classFactor);
      if (drivetrain === 'FWD') front -= 0.4;
      if (drivetrain === 'RWD') rear -= 0.4;
      if (drivetrain === 'AWD') {
        front -= 0.2;
        rear -= 0.2;
      }
    }

    if (raceType === 'drift') {
      front += 3.5 - surfacePreset.softness * 2;
      rear += 2.2 - surfacePreset.softness * 1.7;
      if (drivetrain === 'AWD') rear += 0.8;
    }

    if (raceType === 'drag') {
      front += 7.0 - surfacePreset.softness * 2.2;
      rear -= 8.3 - surfacePreset.softness * 1.2;
      if (horsepower > 800) rear -= 1.5;
      if (drivetrain === 'FWD') {
        front -= 9.0;
        rear += 4.0;
      }
    }

    // Bias nudges contact patch toward the end you want to protect or sharpen.
    front -= handlingPreset.frontGripShift * 3.0;
    rear -= handlingPreset.rearGripShift * 2.2;

    // More nose weight usually wants a little less front pressure for contact patch.
    front -= FT.clamp((weightDistribution - 52) / 25, -0.6, 0.9);
    rear += FT.clamp((weightDistribution - 52) / 30, -0.6, 0.6);

    return {
      frontPsi: FT.round(FT.clamp(front, 16, 40), 1),
      rearPsi: FT.round(FT.clamp(rear, 16, 40), 1),
      note: raceType === 'drag'
        ? 'Drag setup uses high non-drive pressure and low drive-tire pressure for launch bite.'
        : 'Cold PSI is a starting point. Warm telemetry should decide the final nudge.'
    };
  }

  function buildAlignment(ctx) {
    const { raceType, surfacePreset, classFactor, handlingPreset } = ctx;
    let frontCamber;
    let rearCamber;
    let frontToe = 0;
    let rearToe = 0;
    let caster = 5.5 + classFactor * 1.1 - surfacePreset.softness * 0.45;

    if (raceType === 'grip') {
      frontCamber = -FT.lerp(1.1, 2.35, classFactor) + surfacePreset.softness * 0.75;
      rearCamber = -FT.lerp(0.75, 1.65, classFactor) + surfacePreset.softness * 0.55;
      frontCamber -= handlingPreset.frontGripShift * 1.2;
      rearCamber -= Math.max(0, handlingPreset.rearGripShift) * 0.8;
      if (handlingPreset.rotation > 0) frontToe = 0.05;
      if (handlingPreset.rotation < 0) rearToe = 0.05;
    } else if (raceType === 'drift') {
      frontCamber = -FT.lerp(3.0, 4.5, classFactor) + surfacePreset.softness * 1.4;
      rearCamber = -FT.lerp(0.45, 1.2, classFactor) + surfacePreset.softness * 0.55;
      frontToe = FT.lerp(0.2, 0.5, classFactor);
      rearToe = -FT.lerp(0.05, 0.2, classFactor);
      caster = FT.lerp(6.3, 7.0, classFactor);
    } else {
      frontCamber = -FT.lerp(0.05, 0.3, classFactor);
      rearCamber = -FT.lerp(0.05, 0.25, classFactor);
      caster = FT.lerp(5.0, 6.0, classFactor);
    }

    return {
      frontCamber: FT.round(FT.clamp(frontCamber, -5, 0), 1),
      rearCamber: FT.round(FT.clamp(rearCamber, -3.5, 0), 1),
      frontToe: FT.round(frontToe, 2),
      rearToe: FT.round(rearToe, 2),
      caster: FT.round(FT.clamp(caster, 4.5, 7), 1),
      note: raceType === 'drift'
        ? 'Drift alignment adds front bite and steering angle stability.'
        : raceType === 'drag'
          ? 'Drag alignment keeps the tire flat and removes scrub.'
          : 'Grip alignment favors corner load while staying street-race stable.'
    };
  }

  function buildSuspension(ctx) {
    const { raceType, surfacePreset, classFactor, weightDistribution, drivetrain, weight, bodyPreset, suspensionPreset, handlingPreset } = ctx;
    const frontWeightBias = FT.clamp((weightDistribution - 50) / 25, -0.3, 0.5);
    let springBase = FT.lerp(0.33, 0.72, classFactor) - surfacePreset.softness * 0.25 + bodyPreset.stiffness + suspensionPreset.stiffness;
    let arbBase = FT.lerp(0.38, 0.72, classFactor) - surfacePreset.softness * 0.18 + bodyPreset.stiffness * 0.75 + suspensionPreset.stiffness * 0.8;

    if (raceType === 'drag') {
      springBase -= 0.16;
      arbBase -= 0.18;
    }
    if (raceType === 'drift') {
      springBase += 0.06;
      arbBase += 0.1;
    }

    let frontSpring = springBase + frontWeightBias * 0.45;
    let rearSpring = springBase - frontWeightBias * 0.2;
    let frontArb = arbBase + frontWeightBias * 0.25;
    let rearArb = arbBase - frontWeightBias * 0.15;

    // Handling bias changes balance without hiding it from the user.
    if (handlingPreset.rotation > 0) {
      frontArb -= 0.04;
      rearArb += 0.08;
      rearSpring += 0.04;
    } else if (handlingPreset.rotation < 0) {
      frontArb += 0.02;
      rearArb -= 0.08;
      rearSpring -= 0.04;
    }

    if (raceType === 'grip') {
      if (drivetrain === 'FWD') rearArb += 0.1;
      if (drivetrain === 'RWD') rearArb -= 0.03;
      if (drivetrain === 'AWD') rearArb += 0.03;
    }

    if (raceType === 'drift') {
      frontArb += 0.08;
      rearArb += drivetrain === 'AWD' ? 0.14 : 0.08;
      rearSpring += 0.05;
    }

    if (raceType === 'drag') {
      frontSpring -= 0.09;
      rearSpring += drivetrain === 'FWD' ? -0.08 : 0.09;
      frontArb -= 0.1;
      rearArb += drivetrain === 'FWD' ? -0.05 : 0.1;
    }

    const frontArbRatio = FT.clamp(frontArb, 0.08, 0.95);
    const rearArbRatio = FT.clamp(rearArb, 0.08, 0.95);

    function forzaArbSetting(ratio) {
      return FT.round(FT.clamp(1 + ratio * 64, 1, 65), 1);
    }

    const frontSpringRatio = FT.clamp(frontSpring, 0.08, 0.92);
    const rearSpringRatio = FT.clamp(rearSpring, 0.08, 0.92);

    const frontCornerWeight = weight * (weightDistribution / 100) / 2;
    const rearCornerWeight = weight * (1 - weightDistribution / 100) / 2;
    let frontSpringRate = frontCornerWeight * (0.28 + 0.9 * frontSpringRatio);
    let rearSpringRate = rearCornerWeight * (0.28 + 0.9 * rearSpringRatio);
    const surfaceRateFactor = 1.06 - surfacePreset.softness * 0.18;
    frontSpringRate *= surfaceRateFactor;
    rearSpringRate *= surfaceRateFactor;

    if (raceType === 'drift') {
      frontSpringRate *= 1.05;
      rearSpringRate *= 1.05;
    }

    if (raceType === 'drag') {
      if (drivetrain === 'FWD') {
        frontSpringRate *= 1.1;
        rearSpringRate *= 0.85;
      } else {
        frontSpringRate *= 0.78;
        rearSpringRate *= 1.12;
      }
    }

    const reboundBase = FT.clamp(springBase + 0.16 + suspensionPreset.damping, 0.18, 0.9);
    const frontReboundRatio = FT.clamp(reboundBase + frontWeightBias * 0.2, 0.15, 0.95);
    const rearReboundRatio = FT.clamp(reboundBase - frontWeightBias * 0.1 + (rearSpringRatio - frontSpringRatio) * 0.22, 0.15, 0.95);

    function dampingSetting(ratio) {
      return FT.round(FT.clamp(1 + ratio * 19, 1, 20), 1);
    }

    const bumpFraction = raceType === 'drag'
      ? 0.5
      : surfacePreset.softness > 0.7 || ctx.suspensionType === 'rally'
        ? 0.32
        : 0.4;

    const frontReboundSetting = dampingSetting(frontReboundRatio);
    const rearReboundSetting = dampingSetting(rearReboundRatio);
    const frontBumpSetting = FT.round(FT.clamp(frontReboundSetting * bumpFraction, 1, 20), 1);
    const rearBumpSetting = FT.round(FT.clamp(rearReboundSetting * bumpFraction, 1, 20), 1);

    const frontBumpRatio = (frontBumpSetting - 1) / 19;
    const rearBumpRatio = (rearBumpSetting - 1) / 19;

    const lowRideHeightIn = FT.lerp(5.4, 3.7, classFactor) + surfacePreset.softness * 0.6 + bodyPreset.height + suspensionPreset.height;
    const rideHeightRangeIn = FT.lerp(2.1, 4.4, surfacePreset.softness);
    let baseRideHeightIn = lowRideHeightIn + surfacePreset.rideHeight * rideHeightRangeIn;

    if (raceType === 'drag') baseRideHeightIn += 0.15;
    if (raceType === 'drift') baseRideHeightIn += 0.1;

    let frontRideHeightIn = baseRideHeightIn;
    let rearRideHeightIn = baseRideHeightIn + 0.1;

    if (raceType === 'grip') {
      frontRideHeightIn -= surfacePreset.softness < 0.4 ? 0.1 : 0;
      rearRideHeightIn += surfacePreset.softness < 0.4 ? 0.1 : 0;
    }

    if (handlingPreset.rotation > 0 && raceType === 'grip') {
      frontRideHeightIn -= 0.05;
      rearRideHeightIn += 0.08;
    }
    if (handlingPreset.rotation < 0 && raceType === 'grip') {
      rearRideHeightIn -= 0.08;
    }

    if (raceType === 'drift') {
      frontRideHeightIn -= 0.05;
      rearRideHeightIn += 0.25;
    }

    if (raceType === 'drag') {
      if (drivetrain === 'FWD') {
        frontRideHeightIn += 0.2;
        rearRideHeightIn -= 0.1;
      } else {
        frontRideHeightIn -= 0.2;
        rearRideHeightIn += 0.3;
      }
    }

    frontRideHeightIn = FT.clamp(frontRideHeightIn, 3.0, 12.0);
    rearRideHeightIn = FT.clamp(rearRideHeightIn, 3.0, 12.0);

    return {
      antiRollBars: {
        frontSetting: forzaArbSetting(frontArbRatio),
        rearSetting: forzaArbSetting(rearArbRatio),
        frontRatio: FT.round(frontArbRatio, 2),
        rearRatio: FT.round(rearArbRatio, 2),
        scale: '1–65',
        frontLabel: ratioLabel(frontArbRatio),
        rearLabel: ratioLabel(rearArbRatio),
      },
      springs: {
        frontRateLbIn: FT.round(FT.clamp(frontSpringRate, 90, 2200), 0),
        rearRateLbIn: FT.round(FT.clamp(rearSpringRate, 90, 2200), 0),
        frontRatio: FT.round(frontSpringRatio, 2),
        rearRatio: FT.round(rearSpringRatio, 2),
        frontRideHeightIn: FT.round(frontRideHeightIn, 1),
        rearRideHeightIn: FT.round(rearRideHeightIn, 1),
        rideHeightRatio: FT.round(surfacePreset.rideHeight, 2),
        frontLabel: ratioLabel(frontSpringRatio),
        rearLabel: ratioLabel(rearSpringRatio),
        rideHeightLabel: ratioLabel(surfacePreset.rideHeight),
      },
      damping: {
        frontReboundSetting,
        rearReboundSetting,
        frontBumpSetting,
        rearBumpSetting,
        frontReboundRatio: FT.round(frontReboundRatio, 2),
        rearReboundRatio: FT.round(rearReboundRatio, 2),
        frontBumpRatio: FT.round(frontBumpRatio, 2),
        rearBumpRatio: FT.round(rearBumpRatio, 2),
        bumpToReboundPercent: Math.round(bumpFraction * 100),
        note: `Damping is shown on Forza's 1–20 scale. Bump is targeted around ${Math.round(bumpFraction * 100)}% of rebound so compression absorbs bumps while rebound controls the return.`
      },
      note: raceType === 'drag'
        ? 'Drag suspension softens the launch end and stiffens the drive end to help weight transfer. Anti-roll bars use Forza’s 1–65 scale. Ride height, springs, and damping are shown in game-facing units.'
        : "Anti-roll bars use Forza’s 1–65 scale. Ride height, springs, and damping are shown in game-facing units. Fine-tune against each car's exact slider limits."
    };
  }

  function buildDiff(ctx) {
    const { raceType, surfacePreset, drivetrain, classFactor, horsepower, torque, handlingPreset } = ctx;
    const powerAdd = FT.clamp((horsepower - 400) / 1200, 0, 0.18);
    const torqueAdd = FT.clamp((torque - 350) / 1000, -0.05, 0.2);
    let frontAccel = 0;
    let frontDecel = 0;
    let rearAccel = 0;
    let rearDecel = 0;
    let centerBalanceRear = null;

    if (drivetrain === 'FWD') {
      if (raceType === 'drag') {
        frontAccel = 88 + torqueAdd * 18;
        frontDecel = 8;
      } else if (raceType === 'drift') {
        frontAccel = 75;
        frontDecel = 25;
      } else {
        frontAccel = 45 + classFactor * 18 - surfacePreset.softness * 10 - handlingPreset.rotation * 18;
        frontDecel = 8 + classFactor * 10;
      }
    }

    if (drivetrain === 'RWD') {
      if (raceType === 'drag') {
        rearAccel = 96 + torqueAdd * 10;
        rearDecel = 8;
      } else if (raceType === 'drift') {
        rearAccel = 96;
        rearDecel = 78;
      } else {
        rearAccel = 50 + classFactor * 22 + powerAdd * 30 - surfacePreset.softness * 8 - torqueAdd * 14 + handlingPreset.rotation * 10;
        rearDecel = 12 + classFactor * 13 - surfacePreset.softness * 5 - handlingPreset.rotation * 10;
      }
    }

    if (drivetrain === 'AWD') {
      if (raceType === 'drag') {
        frontAccel = 35 + torqueAdd * 8;
        frontDecel = 5;
        rearAccel = 92 + torqueAdd * 10;
        rearDecel = 8;
        centerBalanceRear = 62 + classFactor * 8;
      } else if (raceType === 'drift') {
        frontAccel = 15;
        frontDecel = 0;
        rearAccel = 96;
        rearDecel = 75;
        centerBalanceRear = 82 + classFactor * 8;
      } else {
        frontAccel = 18 + classFactor * 8 - handlingPreset.rotation * 10;
        frontDecel = 4 + classFactor * 3;
        rearAccel = 55 + classFactor * 16 - surfacePreset.softness * 7 - torqueAdd * 8 + handlingPreset.rotation * 8;
        rearDecel = 14 + classFactor * 10 - surfacePreset.softness * 4 - handlingPreset.rotation * 8;
        centerBalanceRear = 60 + classFactor * 8 - surfacePreset.softness * 4 + handlingPreset.rotation * 18;
      }
    }

    return {
      frontAccel: Math.round(FT.clamp(frontAccel, 0, 100)),
      frontDecel: Math.round(FT.clamp(frontDecel, 0, 100)),
      rearAccel: Math.round(FT.clamp(rearAccel, 0, 100)),
      rearDecel: Math.round(FT.clamp(rearDecel, 0, 100)),
      centerBalanceRear: centerBalanceRear === null ? null : Math.round(FT.clamp(centerBalanceRear, 0, 100)),
      note: raceType === 'drift'
        ? 'A locked rear diff makes the slide predictable. AWD drift gets a rear-biased center split.'
        : raceType === 'drag'
          ? 'High accel lock helps both drive tires bite under launch and shift shock.'
          : 'Torque, drivetrain, and handling bias nudge accel lock so exits do not feel welded shut.'
    };
  }

  function buildAeroAndBrakes(ctx) {
    const { raceType, surfacePreset, classFactor, weightDistribution, weight, frontAero, rearAero, frontAeroMinLb, frontAeroMaxLb, rearAeroMinLb, rearAeroMaxLb, bodyPreset, handlingPreset } = ctx;
    let frontRatio = null;
    let rearRatio = null;

    function configuredAeroRange(axis) {
      const minInput = axis === 'front' ? frontAeroMinLb : rearAeroMinLb;
      const maxInput = axis === 'front' ? frontAeroMaxLb : rearAeroMaxLb;
      if (Number.isFinite(minInput) && Number.isFinite(maxInput) && maxInput > minInput) {
        return [FT.clamp(minInput, 0, 1600), FT.clamp(maxInput, 1, 1800)];
      }
      return null;
    }

    function aeroDownforceLb(axis, ratio) {
      const configured = configuredAeroRange(axis);
      if (configured) return Math.round(FT.lerp(configured[0], configured[1], ratio));

      const bodyAeroBoost = FT.clamp(bodyPreset.aero, -0.06, 0.14);
      const surfaceCut = surfacePreset.softness * 0.08;
      const safeWeight = FT.clamp(weight || 3200, 1200, 6500);
      const frontMin = 25 + safeWeight * 0.012;
      const rearMin = 35 + safeWeight * 0.016;
      const frontMax = 85 + safeWeight * (0.075 + classFactor * 0.055 + bodyAeroBoost - surfaceCut);
      const rearMax = 110 + safeWeight * (0.095 + classFactor * 0.075 + bodyAeroBoost - surfaceCut);
      const minLb = axis === 'front' ? FT.clamp(frontMin, 20, 180) : FT.clamp(rearMin, 35, 260);
      const maxLb = axis === 'front' ? FT.clamp(frontMax, minLb + 40, 650) : FT.clamp(rearMax, minLb + 60, 900);
      return Math.round(FT.lerp(minLb, maxLb, ratio));
    }

    if (frontAero) {
      if (raceType === 'drag') frontRatio = 0.05;
      else if (raceType === 'drift') frontRatio = 0.18 + classFactor * 0.1;
      else frontRatio = 0.38 + classFactor * 0.23 - surfacePreset.softness * 0.08 + bodyPreset.aero + handlingPreset.frontGripShift * 0.9;
    }

    if (rearAero) {
      if (raceType === 'drag') rearRatio = 0.08;
      else if (raceType === 'drift') rearRatio = 0.12 + classFactor * 0.08;
      else rearRatio = 0.44 + classFactor * 0.25 - surfacePreset.softness * 0.08 + bodyPreset.aero + handlingPreset.rearGripShift * 0.9;
    }

    let brakeBalanceFront = 50 + FT.clamp((weightDistribution - 50) * 0.22, -2.5, 3.5);
    let brakePressure = 100 + classFactor * 12;

    if (handlingPreset.rotation > 0) brakeBalanceFront -= 0.8;
    if (handlingPreset.rotation < 0) brakeBalanceFront += 0.8;

    if (raceType === 'drag') {
      brakeBalanceFront = 48;
      brakePressure = 95;
    }
    if (surfacePreset.softness > 0.5) {
      brakePressure -= surfacePreset.softness * 8;
    }

    const noAeroNote = !frontAero && !rearAero
      ? 'Aero marked non-adjustable, so no wing slider recommendation is shown.'
      : !frontAero
        ? 'Front aero is missing, so use mechanical front grip if high-speed understeer appears.'
        : !rearAero
          ? 'Rear aero is missing, so use mechanical rear grip if high-speed oversteer appears.'
          : raceType === 'drag' ? 'Minimize aero for straight-line speed.' : 'Use aero balance to fix only high-speed problems.';

    const frontAeroRatio = frontRatio === null ? null : FT.round(FT.clamp(frontRatio, 0, 1), 2);
    const rearAeroRatio = rearRatio === null ? null : FT.round(FT.clamp(rearRatio, 0, 1), 2);

    return {
      aero: {
        frontRatio: frontAeroRatio,
        rearRatio: rearAeroRatio,
        frontDownforceLb: frontAeroRatio === null ? null : aeroDownforceLb('front', frontAeroRatio),
        rearDownforceLb: rearAeroRatio === null ? null : aeroDownforceLb('rear', rearAeroRatio),
        frontLabel: frontAeroRatio === null ? null : ratioLabel(frontAeroRatio),
        rearLabel: rearAeroRatio === null ? null : ratioLabel(rearAeroRatio),
        note: noAeroNote + ' Aero output is shown in pounds of downforce, mapped through the min/max aero ranges entered above. If you leave the defaults, treat the value as an estimate.',
      },
      brakes: {
        balanceFrontPercent: FT.round(FT.clamp(brakeBalanceFront, 45, 58), 1),
        pressurePercent: Math.round(FT.clamp(brakePressure, 75, 120)),
        note: surfacePreset.softness > 0.5 ? 'Lower brake pressure helps prevent dirt-lockups.' : 'Higher classes can use more brake pressure if ABS/trigger control is clean.'
      }
    };
  }

  function buildNotes(ctx, tune) {
    const notes = [];
    notes.push(`${ctx.carClass}-class ${ctx.racePreset.label.toLowerCase()} tune for ${ctx.surfacePreset.label.toLowerCase()}.`);
    notes.push(`${ctx.bodyPreset.label} body, ${ctx.suspensionPreset.label.toLowerCase()} suspension, ${ctx.handlingPreset.label.toLowerCase()} handling bias.`);
    notes.push(ctx.surfacePreset.note);
    notes.push(ctx.racePreset.note);
    notes.push('Workflow: finish the full baseline first, drive one shakedown route, diagnose by corner phase, change one setting, then retest.');

    if (ctx.raceType === 'drag' && ctx.drivetrain === 'FWD') {
      notes.push('FWD drag builds need front tire pressure treated like rear pressure on RWD/AWD cars because the front axle launches the car.');
    }

    if (ctx.surface !== 'pavement' && ctx.raceType === 'drift') {
      notes.push('Offroad/mixed drift should avoid overly stiff suspension or the slide will chatter instead of flowing.');
    }

    if (!ctx.frontAero || !ctx.rearAero) {
      notes.push('One aero axis is missing, so use springs, ARBs, ride height, and diff settings to compensate for high-speed balance.');
    }

    if (tune.gearing.redlineSpeeds[tune.gearing.redlineSpeeds.length - 1] < ctx.idealTopSpeedMph - 3) {
      notes.push('Gear ratios were clamped to Forza-like limits; lengthen final drive if it hits limiter early.');
    }

    return notes;
  }

  function generateTune(options) {
    const carClass = options.carClass || 'A';
    const raceType = options.raceType || 'grip';
    const surface = options.surface || 'pavement';
    const routeStyle = options.routeStyle || 'balanced';
    const drivetrain = options.drivetrain || 'AWD';
    const classFactor = FT.getClassFactor(carClass);
    const surfacePreset = FT.SURFACE_PRESETS[surface] || FT.SURFACE_PRESETS.pavement;
    const racePreset = FT.RACE_PRESETS[raceType] || FT.RACE_PRESETS.grip;
    const compoundPreset = FT.TIRE_COMPOUND_MODIFIERS[options.tireCompound || 'sport'] || FT.TIRE_COMPOUND_MODIFIERS.sport;
    const handlingPreset = FT.HANDLING_BIAS[options.handlingBias || 'neutral'] || FT.HANDLING_BIAS.neutral;
    const enginePreset = FT.ENGINE_LOCATION_DEFAULTS[options.engineLocation || 'front'] || FT.ENGINE_LOCATION_DEFAULTS.front;
    const bodyPreset = FT.BODY_TYPE_PRESETS[options.bodyType || 'track'] || FT.BODY_TYPE_PRESETS.track;
    const suspensionPreset = FT.SUSPENSION_TYPES[options.suspensionType || 'race'] || FT.SUSPENSION_TYPES.race;
    const horsepower = FT.clamp(parseFloat(options.horsepower) || 450, 60, 2000);
    const torque = FT.clamp(parseFloat(options.torque) || Math.round(horsepower * 0.85), 40, 1800);
    const weight = FT.clamp(parseFloat(options.weight) || 3200, 1200, 6500);
    const weightDistribution = FT.clamp(parseFloat(options.weightDistribution) || enginePreset.frontWeight, 35, 70);
    const idealTopSpeedMph = FT.clamp(
      parseFloat(options.idealTopSpeedMph) || FT.getDefaultTopSpeed(carClass, raceType, surface, routeStyle),
      60,
      360
    );
    const frontAero = options.frontAero !== undefined ? !!options.frontAero : !!options.adjustableAero;
    const rearAero = options.rearAero !== undefined ? !!options.rearAero : !!options.adjustableAero;
    const frontAeroMinLb = Number.isFinite(parseFloat(options.frontAeroMinLb)) ? parseFloat(options.frontAeroMinLb) : null;
    const frontAeroMaxLb = Number.isFinite(parseFloat(options.frontAeroMaxLb)) ? parseFloat(options.frontAeroMaxLb) : null;
    const rearAeroMinLb = Number.isFinite(parseFloat(options.rearAeroMinLb)) ? parseFloat(options.rearAeroMinLb) : null;
    const rearAeroMaxLb = Number.isFinite(parseFloat(options.rearAeroMaxLb)) ? parseFloat(options.rearAeroMaxLb) : null;

    const ctx = {
      carClass,
      raceType,
      surface,
      routeStyle,
      drivetrain,
      classFactor,
      surfacePreset,
      racePreset,
      compoundPreset,
      handlingPreset,
      enginePreset,
      bodyPreset,
      suspensionPreset,
      suspensionType: options.suspensionType || 'race',
      horsepower,
      torque,
      weight,
      weightDistribution,
      idealTopSpeedMph,
      frontAero,
      rearAero,
      frontAeroMinLb,
      frontAeroMaxLb,
      rearAeroMinLb,
      rearAeroMaxLb,
    };

    const tires = buildTires(ctx);
    const alignment = buildAlignment(ctx);
    const suspension = buildSuspension(ctx);
    const diff = buildDiff(ctx);
    const aeroAndBrakes = buildAeroAndBrakes(ctx);
    const gearing = FT.GearboxEngine.calculateGearbox({
      ...options,
      carClass,
      raceType,
      surface,
      routeStyle,
      drivetrain,
      horsepower,
      idealTopSpeedMph,
    });

    const tune = {
      id: options.id || `tune-${Date.now()}`,
      createdAt: options.createdAt || new Date().toISOString(),
      carName: options.carName || 'Untitled build',
      summary: {
        carClass,
        raceType,
        raceLabel: racePreset.label,
        surface,
        surfaceLabel: surfacePreset.label,
        routeStyle,
        drivetrain,
        engineLocation: options.engineLocation || 'front',
        engineLocationLabel: enginePreset.label,
        bodyType: options.bodyType || 'track',
        bodyTypeLabel: bodyPreset.label,
        tireCompound: options.tireCompound || 'sport',
        tireCompoundLabel: compoundPreset.label,
        suspensionType: options.suspensionType || 'race',
        suspensionTypeLabel: suspensionPreset.label,
        handlingBias: options.handlingBias || 'neutral',
        handlingBiasLabel: handlingPreset.label,
        horsepower,
        torque,
        weight,
        weightDistribution,
        classFactor: FT.round(classFactor, 2),
        idealTopSpeedMph: FT.round(idealTopSpeedMph, 0),
        frontAero,
        rearAero,
        frontAeroMinLb,
        frontAeroMaxLb,
        rearAeroMinLb,
        rearAeroMaxLb,
      },
      tires,
      alignment,
      antiRollBars: suspension.antiRollBars,
      springs: suspension.springs,
      damping: suspension.damping,
      suspensionNote: suspension.note,
      differential: diff,
      aero: aeroAndBrakes.aero,
      brakes: aeroAndBrakes.brakes,
      gearing,
      notes: [],
    };

    tune.notes = buildNotes(ctx, tune);
    return tune;
  }

  const CORRECTIONS = {
    understeerEntry: {
      label: 'Entry understeer',
      phase: 'Turn-in / braking',
      changes: [
        'Lower front anti-roll bar by 2 to 7 points.',
        'Soften front springs by 3% to 8%.',
        'Soften front rebound by 0.5 to 1.5.',
        'Move brake balance 1% rearward if the nose washes while braking.',
        'For AWD/RWD, reduce rear diff decel slightly.'
      ],
    },
    understeerMid: {
      label: 'Mid-corner understeer',
      phase: 'Steady cornering',
      changes: [
        'Lower front anti-roll bar by 2 to 7 points.',
        'Lower front tire pressure 0.3 to 0.8 PSI.',
        'Add 0.2° to 0.4° more negative front camber.',
        'Increase front aero if the push happens only at high speed.',
        'Lower front ride height 0.1 to 0.2 in if the car has travel left.'
      ],
    },
    understeerThrottle: {
      label: 'Exit understeer',
      phase: 'Power applied',
      changes: [
        'Reduce front diff accel by 5% to 10% on FWD/AWD.',
        'For AWD, move center balance 3% to 6% rearward.',
        'Stiffen rear springs 3% to 8% if the car is too lazy to rotate.',
        'Stiffen rear bump 0.5 to 1.5 if it squats and pushes wide.',
        'Reduce rear toe-in if the rear is too locked down.'
      ],
    },
    understeerHighSpeed: {
      label: 'High-speed understeer',
      phase: 'Fast sweepers',
      changes: [
        'Increase front aero if adjustable.',
        'Reduce rear aero slightly if the rear is too planted.',
        'Add 0.1° to 0.3° more negative front camber.',
        'Lower front ride height 0.1 in if the car is not bottoming out.'
      ],
    },
    oversteerEntry: {
      label: 'Entry oversteer',
      phase: 'Lift / trail brake',
      changes: [
        'Increase rear diff decel by 3% to 8% for more stability.',
        'Lower rear anti-roll bar by 2 to 7 points.',
        'Move brake balance 1% frontward.',
        'Soften rear springs by 3% to 8%.',
        'Stiffen front rebound 0.5 to 1.0 if weight transfer is too sudden.'
      ],
    },
    oversteerMid: {
      label: 'Mid-corner oversteer',
      phase: 'Steady cornering',
      changes: [
        'Lower rear anti-roll bar by 2 to 7 points.',
        'Add 0.1° to 0.3° more negative rear camber.',
        'Increase rear aero if it happens at speed.',
        'Lower rear ride height 0.1 to 0.2 in if it has travel left.'
      ],
    },
    powerOversteer: {
      label: 'Power oversteer',
      phase: 'Exit throttle',
      changes: [
        'Reduce rear diff accel by 5% to 12%.',
        'Lower rear tire pressure 0.3 to 0.8 PSI.',
        'Soften rear springs by 5% to 10%.',
        'Soften rear bump 0.5 to 1.5.',
        'Lengthen 1st and 2nd gear if the car snaps loose on throttle.'
      ],
    },
    snapOversteer: {
      label: 'Snap oversteer',
      phase: 'Sudden rotation',
      changes: [
        'Lower rear anti-roll bar 4 to 10 points.',
        'Soften rear springs 5% to 12%.',
        'Soften rear rebound 0.5 to 2.0.',
        'Soften rear bump 0.5 to 1.5.',
        'Reduce rear diff accel 5% to 10%.'
      ],
    },
    noseDive: {
      label: 'Nose dives under braking',
      phase: 'Braking',
      changes: [
        'Stiffen front bump 0.5 to 1.5.',
        'Stiffen front springs 3% to 8%.',
        'Stiffen front rebound 0.5 to 1.0 only if the car oscillates after braking.',
        'Raise front ride height 0.1 in if it bottoms out.'
      ],
    },
    bouncyFloaty: {
      label: 'Bouncy / floaty',
      phase: 'Bumps and transitions',
      changes: [
        'Stiffen bump damping on both axles 0.5 to 1.5.',
        'Stiffen rebound damping on both axles 0.5 to 1.5.',
        'Stiffen springs 3% to 8% if damping changes are not enough.',
        'Keep bump lower than rebound; do not make the car pogo.'
      ],
    },
    skittersBumps: {
      label: 'Skitters over bumps / curbs',
      phase: 'Rough surfaces',
      changes: [
        'Soften bump damping 0.5 to 2.0.',
        'Soften springs 5% to 12%.',
        'Soften anti-roll bars 3 to 8 points.',
        'Raise ride height 0.2 to 0.5 in.',
        'Lower tire pressure 0.5 to 1.5 PSI for dirt or mixed surfaces.'
      ],
    },
    bottomsOut: {
      label: 'Bottoms out / scrapes',
      phase: 'Compression travel',
      changes: [
        'Raise ride height 0.2 to 0.6 in.',
        'Stiffen springs 5% to 12%.',
        'Stiffen bump damping 0.5 to 1.5.',
        'For offroad, prioritize ride height before stiffness.'
      ],
    },
    wheelspinExit: {
      label: 'Wheelspin on exit',
      phase: 'Throttle exit',
      changes: [
        'Reduce rear diff accel by 5% to 12%.',
        'Soften rear springs by 5% to 10%.',
        'Soften rear bump 0.5 to 1.5.',
        'Increase rear aero if the spin starts in fast exits.',
        'Lengthen the gear used on corner exit.'
      ],
    },
    wheelspinLaunch: {
      label: 'Wheelspin on launch',
      phase: 'Standing start',
      changes: [
        'Lengthen 1st gear or reduce final drive.',
        'Lower drive-tire pressure 0.5 to 1.5 PSI.',
        'Soften the launch end of the car and avoid max-stiff rebound.',
        'For AWD drag, move center balance slightly forward if all four tires spin unevenly.'
      ],
    },
    lazyChicanes: {
      label: 'Lazy in chicanes',
      phase: 'Direction changes',
      changes: [
        'Stiffen both anti-roll bars 3 to 8 points.',
        'Stiffen rebound damping on both axles 0.5 to 1.5.',
        'Stiffen springs 3% to 8%.',
        'Add a small amount of front toe-out if turn-in still feels asleep.'
      ],
    },
    limiterEarly: {
      label: 'Hits limiter too early',
      phase: 'Gearing',
      changes: [
        'Lengthen final drive by moving the slider toward speed.',
        'Lengthen top gear if only the last gear is too short.',
        'Raise ideal top speed 5 to 15 MPH and regenerate gearing.',
        'For drag, confirm the car reaches redline just after the finish, not before.'
      ],
    },
    neverTopGear: {
      label: 'Never reaches top gear',
      phase: 'Gearing',
      changes: [
        'Shorten final drive by moving the slider toward acceleration.',
        'Lower ideal top speed 5 to 15 MPH and regenerate gearing.',
        'Shorten upper gears if acceleration falls flat after mid-track.',
        'For technical tracks, favor acceleration over theoretical top speed.'
      ],
    },
  };

  FT.TuningEngine = {
    generateTune,
    ratioLabel,
    CORRECTIONS,
  };
})();

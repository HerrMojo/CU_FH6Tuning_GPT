/* Forza Tune App - gearbox calculations */
(function () {
  const FT = (window.ForzaTune = window.ForzaTune || {});

  function speedAtRedlineMph(redlineRpm, tireCircumferenceInches, overallRatio) {
    return (redlineRpm * tireCircumferenceInches) / (overallRatio * 1056);
  }

  function overallRatioForSpeed(redlineRpm, tireCircumferenceInches, mph) {
    return (redlineRpm * tireCircumferenceInches) / (mph * 1056);
  }

  function estimateTireCircumferenceInches(tireDiameterInches) {
    return Math.PI * tireDiameterInches;
  }

  function getFirstGearPercent(raceType, surface, classFactor, horsepower, drivetrain) {
    const race = FT.RACE_PRESETS[raceType] || FT.RACE_PRESETS.grip;
    const surfacePreset = FT.SURFACE_PRESETS[surface] || FT.SURFACE_PRESETS.pavement;
    let percent = race.firstGearPercent;

    // High-powered cars and low-grip surfaces need a taller 1st gear to avoid smoke-show soup.
    const powerPenalty = FT.clamp((horsepower - 450) / 900, 0, 0.08);
    const surfacePenalty = FT.clamp(surfacePreset.softness * 0.055, 0, 0.06);
    const drivetrainPenalty = drivetrain === 'RWD' ? 0.025 : drivetrain === 'FWD' ? 0.015 : 0;

    if (raceType === 'drag') {
      percent += powerPenalty + surfacePenalty + drivetrainPenalty;
    } else if (raceType === 'drift') {
      percent += 0.04 * classFactor;
    } else {
      percent += surfacePenalty * 0.55 + powerPenalty * 0.4;
    }

    return FT.clamp(percent, 0.16, 0.42);
  }

  function chooseFinalDrive(classFactor, raceType, surface, gearCount, targetTopOverall, routeStyle = 'balanced') {
    const surfaceSoftness = (FT.SURFACE_PRESETS[surface] || FT.SURFACE_PRESETS.pavement).softness;
    let finalDrive = 3.25 + classFactor * 0.35 + surfaceSoftness * 0.18;

    if (raceType === 'drag') finalDrive -= 0.1;
    if (raceType === 'drift') finalDrive += 0.15;
    if (routeStyle === 'technical') finalDrive += 0.18;
    if (routeStyle === 'highspeed') finalDrive -= 0.16;
    if (gearCount >= 8) finalDrive += 0.12;

    // Keep top gear in a useful-looking Forza range.
    if (targetTopOverall / finalDrive < 0.55) finalDrive = targetTopOverall / 0.55;
    if (targetTopOverall / finalDrive > 1.1) finalDrive = targetTopOverall / 1.1;

    return FT.round(FT.clamp(finalDrive, 2.2, 6.1), 2);
  }

  function calculateGearbox(options) {
    const carClass = options.carClass || 'A';
    const raceType = options.raceType || 'grip';
    const surface = options.surface || 'pavement';
    const drivetrain = options.drivetrain || 'AWD';
    const routeStyle = options.routeStyle || 'balanced';
    const gearCount = FT.clamp(parseInt(options.gearCount, 10) || 6, 4, 10);
    const redlineRpm = FT.clamp(parseFloat(options.redlineRpm) || 7000, 4000, 12000);
    const horsepower = FT.clamp(parseFloat(options.horsepower) || 450, 60, 2000);
    const idealTopSpeedMph = FT.clamp(parseFloat(options.idealTopSpeedMph) || 180, 60, 360);
    const tireDiameterInches = FT.clamp(parseFloat(options.tireDiameterInches) || 26, 18, 36);
    const tireCircumferenceInches = options.tireCircumferenceInches
      ? FT.clamp(parseFloat(options.tireCircumferenceInches), 50, 120)
      : estimateTireCircumferenceInches(tireDiameterInches);

    const classFactor = FT.getClassFactor(carClass);
    const firstGearPercent = getFirstGearPercent(raceType, surface, classFactor, horsepower, drivetrain);
    const firstGearSpeed = FT.clamp(idealTopSpeedMph * firstGearPercent, 18, idealTopSpeedMph * 0.5);

    const overallTopRatio = overallRatioForSpeed(redlineRpm, tireCircumferenceInches, idealTopSpeedMph);
    const overallFirstRatio = overallRatioForSpeed(redlineRpm, tireCircumferenceInches, firstGearSpeed);
    const spacingRatio = Math.pow(overallFirstRatio / overallTopRatio, 1 / (gearCount - 1));
    const finalDrive = chooseFinalDrive(classFactor, raceType, surface, gearCount, overallTopRatio, routeStyle);

    const gears = [];
    const redlineSpeeds = [];

    for (let i = 0; i < gearCount; i += 1) {
      const overallRatio = overallFirstRatio / Math.pow(spacingRatio, i);
      const gearRatio = overallRatio / finalDrive;
      gears.push(FT.round(FT.clamp(gearRatio, 0.45, 6.0), 2));
      redlineSpeeds.push(FT.round(speedAtRedlineMph(redlineRpm, tireCircumferenceInches, gearRatio * finalDrive), 1));
    }

    let shiftNote = 'Top gear should approach the target top speed near redline.';
    if (raceType === 'drag') {
      shiftNote = 'If launch wheelspin is heavy, lengthen 1st before touching power or tire pressure. Final drive is kept inside a 2.20–6.10 game-style range.';
    }
    if (raceType === 'drift') {
      const mainGear = gearCount <= 6 ? 3 : 4;
      shiftNote = `Aim to hold ${mainGear}${mainGear === 3 ? 'rd' : 'th'} gear for most medium-speed drift zones.`;
    }
    if (surface !== 'pavement') {
      shiftNote += ' Low-grip surfaces usually prefer slightly taller lower gears than the math first suggests.';
    }

    return {
      finalDrive,
      gearCount,
      gears,
      redlineSpeeds,
      idealTopSpeedMph: FT.round(idealTopSpeedMph, 0),
      firstGearSpeed: FT.round(firstGearSpeed, 1),
      tireDiameterInches: FT.round(tireDiameterInches, 1),
      redlineRpm: Math.round(redlineRpm),
      tireCircumferenceInches: FT.round(tireCircumferenceInches, 1),
      overallTopRatio: FT.round(overallTopRatio, 2),
      overallFirstRatio: FT.round(overallFirstRatio, 2),
      shiftNote,
      formula: 'mph = (RPM × tire circumference inches) / (gear ratio × final drive × 1056)',
    };
  }

  FT.GearboxEngine = {
    calculateGearbox,
    speedAtRedlineMph,
    overallRatioForSpeed,
    estimateTireCircumferenceInches,
  };
})();

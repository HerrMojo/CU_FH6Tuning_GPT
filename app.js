/* FH6GPT Tune Lab - UI wiring */
(function () {
  const FT = window.ForzaTune;
  let state = {
    raceType: 'grip',
    surface: 'pavement',
    currentTune: null,
    frontWeightTouched: false,
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  const form = $('#tuneForm');
  const output = $('#tuneOutput');
  const savedList = $('#savedList');
  const correctionOutput = $('#correctionOutput');
  const topSpeedInput = $('#idealTopSpeedMph');
  const carClassInput = $('#carClass');
  const routeStyleInput = $('#routeStyle');

  function init() {
    setupModeButtons();
    setupFormDefaults();
    setupActions();
    renderSavedTunes();
    generateAndRender();

    if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
      navigator.serviceWorker.register('./service-worker.js').catch(() => {
        // PWA registration is optional; the calculator still works without it.
      });
    }
  }

  function setupModeButtons() {
    $$('.option-card[data-race]').forEach((button) => {
      button.addEventListener('click', () => {
        state.raceType = button.dataset.race;
        updateActiveButtons();
        syncSuspensionForMode();
        setDefaultTopSpeed();
        generateAndRender();
      });
    });

    $$('.option-chip[data-surface]').forEach((button) => {
      button.addEventListener('click', () => {
        state.surface = button.dataset.surface;
        updateActiveButtons();
        syncSuspensionForMode();
        setDefaultTopSpeed();
        generateAndRender();
      });
    });
  }

  function setupFormDefaults() {
    setDefaultTopSpeed();
    updateActiveButtons();

    $('#weightDistribution').addEventListener('input', () => {
      state.frontWeightTouched = true;
    });

    $('#engineLocation').addEventListener('change', () => {
      if (!state.frontWeightTouched) {
        const preset = FT.ENGINE_LOCATION_DEFAULTS[$('#engineLocation').value] || FT.ENGINE_LOCATION_DEFAULTS.front;
        $('#weightDistribution').value = preset.frontWeight;
      }
    });

    ['change', 'input'].forEach((eventName) => {
      form.addEventListener(eventName, (event) => {
        if (event.target.id === 'carClass' || event.target.id === 'routeStyle') {
          setDefaultTopSpeed();
        }
        if (event.target.matches('input, select')) {
          generateAndRender();
        }
      });
    });
  }

  function setupActions() {
    $('#generateBtn').addEventListener('click', generateAndRender);
    $('#resetBtn').addEventListener('click', () => {
      form.reset();
      state.raceType = 'grip';
      state.surface = 'pavement';
      state.frontWeightTouched = false;
      setDefaultTopSpeed();
      updateActiveButtons();
      generateAndRender();
    });

    $('#copyBtn').addEventListener('click', async () => {
      if (!state.currentTune) generateAndRender();
      const text = formatTuneForClipboard(state.currentTune);
      try {
        await navigator.clipboard.writeText(text);
        showToast('Tune copied to clipboard.');
      } catch (error) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
        showToast('Tune copied to clipboard.');
      }
    });

    $('#saveBtn').addEventListener('click', () => {
      if (!state.currentTune) generateAndRender();
      const saved = FT.Storage.saveTune(state.currentTune);
      state.currentTune = saved;
      renderSavedTunes();
      showToast('Tune saved to this browser.');
    });

    $('#exportBtn').addEventListener('click', () => {
      if (!state.currentTune) generateAndRender();
      const blob = new Blob([JSON.stringify(state.currentTune, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      const safeName = (state.currentTune.carName || 'forza-tune').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      link.href = URL.createObjectURL(blob);
      link.download = `${safeName}-${state.currentTune.summary.carClass}-${state.currentTune.summary.raceType}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
    });


    $('#exportSqlBtn').addEventListener('click', () => {
      if (!state.currentTune) generateAndRender();
      const sql = buildSqlExport(state.currentTune);
      const safeName = (state.currentTune.carName || 'forza-tune').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      downloadTextFile(sql, `${safeName}-${state.currentTune.summary.carClass}-${state.currentTune.summary.raceType}.sql`, 'application/sql');
      showToast('SQL export downloaded.');
    });

    $('#clearSavedBtn').addEventListener('click', () => {
      if (confirm('Clear all saved tunes from this browser?')) {
        FT.Storage.clearTunes();
        renderSavedTunes();
        showToast('Saved tunes cleared.');
      }
    });

    $$('.fix-button').forEach((button) => {
      button.addEventListener('click', () => renderCorrection(button.dataset.fix));
    });
  }

  function updateActiveButtons() {
    $$('.option-card[data-race]').forEach((button) => {
      button.classList.toggle('active', button.dataset.race === state.raceType);
    });
    $$('.option-chip[data-surface]').forEach((button) => {
      button.classList.toggle('active', button.dataset.surface === state.surface);
    });
  }

  function syncSuspensionForMode() {
    const suspensionInput = $('#suspensionType');
    if (state.surface === 'offroad' || state.surface === 'mixed') suspensionInput.value = 'rally';
    if (state.raceType === 'drift') suspensionInput.value = 'drift';
    if (state.raceType === 'drag' && state.surface === 'pavement') suspensionInput.value = 'race';
  }

  function setDefaultTopSpeed() {
    const speed = FT.getDefaultTopSpeed(carClassInput.value, state.raceType, state.surface, routeStyleInput.value);
    topSpeedInput.value = speed;
  }

  function collectInput() {
    return {
      carName: $('#carName').value.trim() || 'Untitled build',
      carClass: $('#carClass').value,
      raceType: state.raceType,
      surface: state.surface,
      routeStyle: $('#routeStyle').value,
      drivetrain: $('#drivetrain').value,
      engineLocation: $('#engineLocation').value,
      bodyType: $('#bodyType').value,
      tireCompound: $('#tireCompound').value,
      suspensionType: $('#suspensionType').value,
      handlingBias: $('#handlingBias').value,
      horsepower: $('#horsepower').value,
      torque: $('#torque').value,
      weight: $('#weight').value,
      weightDistribution: $('#weightDistribution').value,
      gearCount: $('#gearCount').value,
      redlineRpm: $('#redlineRpm').value,
      idealTopSpeedMph: $('#idealTopSpeedMph').value,
      tireSizeCode: $('#tireSizeCode').value,
      frontAero: $('#frontAero').checked,
      rearAero: $('#rearAero').checked,
      frontAeroMinLb: $('#frontAeroMinLb').value,
      frontAeroMaxLb: $('#frontAeroMaxLb').value,
      rearAeroMinLb: $('#rearAeroMinLb').value,
      rearAeroMaxLb: $('#rearAeroMaxLb').value,
    };
  }

  function generateAndRender() {
    state.currentTune = FT.TuningEngine.generateTune(collectInput());
    renderTune(state.currentTune);
    correctionOutput.innerHTML = '<p class="muted">Pick a symptom and the app will suggest small tuning nudges.</p>';
  }

  function renderTune(tune) {
    const gearRows = tune.gearing.gears.map((ratio, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${ratio.toFixed(2)}</td>
        <td>${tune.gearing.redlineSpeeds[index].toFixed(1)} mph</td>
      </tr>
    `).join('');

    output.innerHTML = `
      <section class="result-hero">
        <div>
          <p class="eyebrow">Generated tune</p>
          <h2>${escapeHtml(tune.carName)}</h2>
          <p>${tune.summary.carClass}-Class ${tune.summary.raceLabel} · ${tune.summary.surfaceLabel} · ${tune.summary.drivetrain} · ${tune.summary.handlingBiasLabel}</p>
        </div>
        <div class="speed-badge">
          <span>${tune.summary.idealTopSpeedMph}</span>
          <small>target mph</small>
        </div>
      </section>

      <div class="result-grid">
        ${renderCard('Build profile', [
          ['Engine', tune.summary.engineLocationLabel],
          ['Body', tune.summary.bodyTypeLabel],
          ['Suspension', tune.summary.suspensionTypeLabel],
          ['Tires', tune.summary.tireCompoundLabel],
          ['Power', `${tune.summary.horsepower} hp / ${tune.summary.torque} lb-ft`],
        ], 'Profile inputs now influence spring, damper, aero, and differential scaling.')}

        ${renderCard('Tires', [
          ['Front', `${tune.tires.frontPsi} PSI`],
          ['Rear', `${tune.tires.rearPsi} PSI`],
        ], tune.tires.note)}

        ${renderCard('Alignment', [
          ['Front camber', `${FT.formatSigned(tune.alignment.frontCamber)}°`],
          ['Rear camber', `${FT.formatSigned(tune.alignment.rearCamber)}°`],
          ['Front toe', `${FT.formatSigned(tune.alignment.frontToe, 2)}°`],
          ['Rear toe', `${FT.formatSigned(tune.alignment.rearToe, 2)}°`],
          ['Caster', `${tune.alignment.caster}°`],
        ], tune.alignment.note)}

        ${renderCard('Anti-roll bars', [
          ['Front setting', `${tune.antiRollBars.frontSetting ?? FT.round(1 + tune.antiRollBars.frontRatio * 64, 1)} / 65 (${tune.antiRollBars.frontLabel})`],
          ['Rear setting', `${tune.antiRollBars.rearSetting ?? FT.round(1 + tune.antiRollBars.rearRatio * 64, 1)} / 65 (${tune.antiRollBars.rearLabel})`],
        ], tune.suspensionNote)}

        ${renderCard('Springs & ride height', [
          ['Front spring', `${tune.springs.frontRateLbIn ?? '—'} lb/in (${tune.springs.frontLabel})`],
          ['Rear spring', `${tune.springs.rearRateLbIn ?? '—'} lb/in (${tune.springs.rearLabel})`],
          ['Front ride height', `${tune.springs.frontRideHeightIn ?? '—'} in (${tune.springs.rideHeightLabel})`],
          ['Rear ride height', `${tune.springs.rearRideHeightIn ?? '—'} in (${tune.springs.rideHeightLabel})`],
        ], 'Springs are estimated in lb/in and ride height is estimated in inches. Match the nearest value your specific car allows.')}

        ${renderCard('Damping', [
          ['Front rebound stiffness', tune.damping.frontReboundSetting ?? tune.damping.frontReboundRatio],
          ['Rear rebound stiffness', tune.damping.rearReboundSetting ?? tune.damping.rearReboundRatio],
          ['Front bump stiffness', tune.damping.frontBumpSetting ?? tune.damping.frontBumpRatio],
          ['Rear bump stiffness', tune.damping.rearBumpSetting ?? tune.damping.rearBumpRatio],
        ], tune.damping.note)}

        ${renderCard('Differential', diffRows(tune), tune.differential.note)}

        ${renderCard('Aero', aeroRows(tune), tune.aero.note)}

        ${renderCard('Brakes', [
          ['Balance', `${tune.brakes.balanceFrontPercent}% front`],
          ['Pressure', `${tune.brakes.pressurePercent}%`],
        ], tune.brakes.note)}
      </div>

      <section class="panel gear-panel">
        <div class="section-title-row">
          <div>
            <p class="eyebrow">Gearbox</p>
            <h3>Final drive ${tune.gearing.finalDrive.toFixed(2)}</h3>
          </div>
          <div class="gear-pill-stack">
            <span class="pill">${tune.gearing.gearCount} gears</span>
            <span class="pill">${escapeHtml(tune.gearing.tireSizeCode || 'tire size')}</span>
          </div>
        </div>
        ${renderGearGraph(tune)}
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Gear</th><th>Ratio</th><th>Redline speed</th></tr>
            </thead>
            <tbody>${gearRows}</tbody>
          </table>
        </div>
        <p class="muted">Tire code ${escapeHtml(tune.gearing.tireSizeCode || 'not set')} calculates to ${tune.gearing.tireDiameterInches} in diameter and ${tune.gearing.tireCircumferenceInches} in circumference for the gearing math.</p>
        <p class="muted">${escapeHtml(tune.gearing.shiftNote)}</p>
        <p class="formula">${escapeHtml(tune.gearing.formula)}</p>
      </section>

      <section class="panel notes-panel">
        <p class="eyebrow">Tuning notes</p>
        <ul>${tune.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul>
      </section>
    `;
  }

  function renderGearGraph(tune) {
    const maxSpeed = Math.max(...tune.gearing.redlineSpeeds, tune.summary.idealTopSpeedMph);
    const bars = tune.gearing.redlineSpeeds.map((speed, index) => {
      const width = Math.max(5, Math.min(100, (speed / maxSpeed) * 100));
      return `
        <div class="gear-bar-row">
          <span>G${index + 1}</span>
          <div class="gear-bar-track"><i style="width:${width}%"></i></div>
          <b>${speed.toFixed(0)} mph</b>
        </div>
      `;
    }).join('');
    return `
      <div class="gear-graph" aria-label="Gear redline speed graph">
        ${bars}
      </div>
    `;
  }

  function renderCard(title, rows, note) {
    return `
      <section class="result-card">
        <h3>${escapeHtml(title)}</h3>
        <dl>
          ${rows.map(([label, value]) => `
            <div>
              <dt>${escapeHtml(label)}</dt>
              <dd>${escapeHtml(value)}</dd>
            </div>
          `).join('')}
        </dl>
        <p>${escapeHtml(note)}</p>
      </section>
    `;
  }

  function diffRows(tune) {
    const rows = [];
    if (tune.summary.drivetrain === 'FWD' || tune.summary.drivetrain === 'AWD') {
      rows.push(['Front accel', `${tune.differential.frontAccel}%`]);
      rows.push(['Front decel', `${tune.differential.frontDecel}%`]);
    }
    if (tune.summary.drivetrain === 'RWD' || tune.summary.drivetrain === 'AWD') {
      rows.push(['Rear accel', `${tune.differential.rearAccel}%`]);
      rows.push(['Rear decel', `${tune.differential.rearDecel}%`]);
    }
    if (tune.differential.centerBalanceRear !== null) {
      rows.push(['Center balance', `${tune.differential.centerBalanceRear}% rear`]);
    }
    return rows;
  }

  function formatAero(axis, tune) {
    const ratio = axis === 'front' ? tune.aero.frontRatio : tune.aero.rearRatio;
    const downforce = axis === 'front' ? tune.aero.frontDownforceLb : tune.aero.rearDownforceLb;
    const label = axis === 'front' ? tune.aero.frontLabel : tune.aero.rearLabel;
    if (ratio === null) return 'Not adjustable';
    if (downforce !== undefined && downforce !== null) return `${downforce} lb (${label || 'estimated'})`;
    return `Legacy ratio ${ratio}`;
  }

  function aeroRows(tune) {
    const rows = [];
    rows.push(['Front aero', formatAero('front', tune)]);
    rows.push(['Rear aero', formatAero('rear', tune)]);
    return rows;
  }

  function renderCorrection(key) {
    const correction = FT.TuningEngine.CORRECTIONS[key];
    if (!correction) return;
    correctionOutput.innerHTML = `
      <h3>${escapeHtml(correction.label)}</h3>
      <p class="muted"><strong>Phase:</strong> ${escapeHtml(correction.phase || 'General')}</p>
      <ol>${correction.changes.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ol>
      <p class="muted">Make one change at a time, run the same route again, then judge by lap feel and tire telemetry.</p>
    `;
  }

  function renderSavedTunes() {
    const saved = FT.Storage.getSavedTunes();
    if (!saved.length) {
      savedList.innerHTML = '<p class="muted">No saved tunes yet. Your garage shelf is still suspiciously tidy.</p>';
      return;
    }

    savedList.innerHTML = saved.map((tune) => `
      <article class="saved-item">
        <div>
          <strong>${escapeHtml(tune.carName)}</strong>
          <span>${tune.summary.carClass} · ${tune.summary.raceLabel} · ${tune.summary.surfaceLabel} · ${tune.summary.handlingBiasLabel || 'Neutral'}</span>
        </div>
        <div class="saved-actions">
          <button type="button" data-load="${tune.id}">Load</button>
          <button type="button" data-delete="${tune.id}" aria-label="Delete saved tune">Delete</button>
        </div>
      </article>
    `).join('');

    $$('[data-load]').forEach((button) => {
      button.addEventListener('click', () => loadTune(button.dataset.load));
    });
    $$('[data-delete]').forEach((button) => {
      button.addEventListener('click', () => {
        FT.Storage.deleteTune(button.dataset.delete);
        renderSavedTunes();
        showToast('Saved tune deleted.');
      });
    });
  }

  function loadTune(id) {
    const saved = FT.Storage.getSavedTunes().find((tune) => tune.id === id);
    if (!saved) return;
    $('#carName').value = saved.carName || '';
    $('#carClass').value = saved.summary.carClass;
    $('#routeStyle').value = saved.summary.routeStyle || 'balanced';
    $('#drivetrain').value = saved.summary.drivetrain;
    $('#engineLocation').value = saved.summary.engineLocation || 'front';
    $('#bodyType').value = saved.summary.bodyType || 'track';
    $('#tireCompound').value = saved.summary.tireCompound || 'sport';
    $('#suspensionType').value = saved.summary.suspensionType || 'race';
    $('#handlingBias').value = saved.summary.handlingBias || 'neutral';
    $('#horsepower').value = saved.summary.horsepower;
    $('#torque').value = saved.summary.torque || Math.round((saved.summary.horsepower || 450) * 0.85);
    $('#weight').value = saved.summary.weight;
    $('#weightDistribution').value = saved.summary.weightDistribution;
    $('#gearCount').value = saved.gearing.gearCount;
    $('#redlineRpm').value = saved.gearing.redlineRpm || $('#redlineRpm').value;
    $('#idealTopSpeedMph').value = saved.summary.idealTopSpeedMph;
    $('#tireSizeCode').value = saved.gearing.tireSizeCode || saved.summary.tireSizeCode || $('#tireSizeCode').value;
    $('#frontAero').checked = saved.summary.frontAero !== undefined ? saved.summary.frontAero : saved.aero.frontRatio !== null;
    $('#rearAero').checked = saved.summary.rearAero !== undefined ? saved.summary.rearAero : saved.aero.rearRatio !== null;
    $('#frontAeroMinLb').value = saved.summary.frontAeroMinLb ?? $('#frontAeroMinLb').value;
    $('#frontAeroMaxLb').value = saved.summary.frontAeroMaxLb ?? $('#frontAeroMaxLb').value;
    $('#rearAeroMinLb').value = saved.summary.rearAeroMinLb ?? $('#rearAeroMinLb').value;
    $('#rearAeroMaxLb').value = saved.summary.rearAeroMaxLb ?? $('#rearAeroMaxLb').value;
    state.raceType = saved.summary.raceType;
    state.surface = saved.summary.surface;
    state.frontWeightTouched = true;
    updateActiveButtons();
    state.currentTune = saved;
    renderTune(saved);
    showToast('Tune loaded.');
  }

  function downloadTextFile(text, fileName, mimeType) {
    const blob = new Blob([text], { type: mimeType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function sqlText(value) {
    if (value === undefined || value === null || value === '') return 'NULL';
    return `'${String(value).replace(/'/g, "''")}'`;
  }

  function sqlNumber(value) {
    if (value === undefined || value === null || value === '' || Number.isNaN(Number(value))) return 'NULL';
    return String(Number(value));
  }

  function buildSqlExport(tune) {
    const tuneId = tune.id || `tune-${Date.now()}`;
    const savedAt = tune.savedAt || new Date().toISOString();
    const gearsJson = JSON.stringify(tune.gearing.gears || []);
    const tuneJson = JSON.stringify({ ...tune, id: tuneId, savedAt });

    const columns = [
      'id', 'car_name', 'saved_at', 'car_class', 'race_type', 'surface', 'drivetrain',
      'engine_location', 'body_type', 'tire_compound', 'suspension_type', 'handling_bias',
      'horsepower', 'torque', 'weight_lbs', 'front_weight_percent', 'ideal_top_speed_mph',
      'tire_size_code', 'front_tire_psi', 'rear_tire_psi', 'front_camber', 'rear_camber',
      'front_toe', 'rear_toe', 'caster', 'front_arb', 'rear_arb', 'front_spring_lb_in',
      'rear_spring_lb_in', 'front_ride_height_in', 'rear_ride_height_in', 'front_rebound',
      'rear_rebound', 'front_bump', 'rear_bump', 'brake_balance_front_percent',
      'brake_pressure_percent', 'front_aero_lb', 'rear_aero_lb', 'final_drive',
      'gears_json', 'tune_json'
    ];

    const values = [
      sqlText(tuneId),
      sqlText(tune.carName),
      sqlText(savedAt),
      sqlText(tune.summary.carClass),
      sqlText(tune.summary.raceType),
      sqlText(tune.summary.surface),
      sqlText(tune.summary.drivetrain),
      sqlText(tune.summary.engineLocation),
      sqlText(tune.summary.bodyType),
      sqlText(tune.summary.tireCompound),
      sqlText(tune.summary.suspensionType),
      sqlText(tune.summary.handlingBias),
      sqlNumber(tune.summary.horsepower),
      sqlNumber(tune.summary.torque),
      sqlNumber(tune.summary.weight),
      sqlNumber(tune.summary.weightDistribution),
      sqlNumber(tune.summary.idealTopSpeedMph),
      sqlText(tune.gearing.tireSizeCode || tune.summary.tireSizeCode),
      sqlNumber(tune.tires.frontPsi),
      sqlNumber(tune.tires.rearPsi),
      sqlNumber(tune.alignment.frontCamber),
      sqlNumber(tune.alignment.rearCamber),
      sqlNumber(tune.alignment.frontToe),
      sqlNumber(tune.alignment.rearToe),
      sqlNumber(tune.alignment.caster),
      sqlNumber(tune.antiRollBars.frontSetting),
      sqlNumber(tune.antiRollBars.rearSetting),
      sqlNumber(tune.springs.frontRateLbIn),
      sqlNumber(tune.springs.rearRateLbIn),
      sqlNumber(tune.springs.frontRideHeightIn),
      sqlNumber(tune.springs.rearRideHeightIn),
      sqlNumber(tune.damping.frontReboundSetting),
      sqlNumber(tune.damping.rearReboundSetting),
      sqlNumber(tune.damping.frontBumpSetting),
      sqlNumber(tune.damping.rearBumpSetting),
      sqlNumber(tune.brakes.balanceFrontPercent),
      sqlNumber(tune.brakes.pressurePercent),
      sqlNumber(tune.aero.frontDownforceLb),
      sqlNumber(tune.aero.rearDownforceLb),
      sqlNumber(tune.gearing.finalDrive),
      sqlText(gearsJson),
      sqlText(tuneJson)
    ];

    return `-- FH6GPT Tune Lab SQL export
-- Import with: sqlite3 forza_tunes.db < this-file.sql

CREATE TABLE IF NOT EXISTS forza_tunes (
  id TEXT PRIMARY KEY,
  car_name TEXT,
  saved_at TEXT,
  car_class TEXT,
  race_type TEXT,
  surface TEXT,
  drivetrain TEXT,
  engine_location TEXT,
  body_type TEXT,
  tire_compound TEXT,
  suspension_type TEXT,
  handling_bias TEXT,
  horsepower INTEGER,
  torque INTEGER,
  weight_lbs INTEGER,
  front_weight_percent REAL,
  ideal_top_speed_mph INTEGER,
  tire_size_code TEXT,
  front_tire_psi REAL,
  rear_tire_psi REAL,
  front_camber REAL,
  rear_camber REAL,
  front_toe REAL,
  rear_toe REAL,
  caster REAL,
  front_arb REAL,
  rear_arb REAL,
  front_spring_lb_in INTEGER,
  rear_spring_lb_in INTEGER,
  front_ride_height_in REAL,
  rear_ride_height_in REAL,
  front_rebound REAL,
  rear_rebound REAL,
  front_bump REAL,
  rear_bump REAL,
  brake_balance_front_percent INTEGER,
  brake_pressure_percent INTEGER,
  front_aero_lb INTEGER,
  rear_aero_lb INTEGER,
  final_drive REAL,
  gears_json TEXT,
  tune_json TEXT
);

INSERT OR REPLACE INTO forza_tunes (
  ${columns.join(',\n  ')}
) VALUES (
  ${values.join(',\n  ')}
);
`;
  }

  function formatTuneForClipboard(tune) {
    const lines = [];
    lines.push(`${tune.carName} — ${tune.summary.carClass} ${tune.summary.raceLabel} / ${tune.summary.surfaceLabel}`);
    lines.push(`${tune.summary.drivetrain}, ${tune.summary.engineLocationLabel} engine, ${tune.summary.bodyTypeLabel}, ${tune.summary.handlingBiasLabel}`);
    lines.push('');
    lines.push(`Tires: F ${tune.tires.frontPsi} PSI / R ${tune.tires.rearPsi} PSI`);
    lines.push(`Alignment: camber F ${FT.formatSigned(tune.alignment.frontCamber)}° / R ${FT.formatSigned(tune.alignment.rearCamber)}°, toe F ${FT.formatSigned(tune.alignment.frontToe, 2)}° / R ${FT.formatSigned(tune.alignment.rearToe, 2)}°, caster ${tune.alignment.caster}°`);
    lines.push(`ARBs: F ${tune.antiRollBars.frontSetting} / R ${tune.antiRollBars.rearSetting}`);
    lines.push(`Springs: F ${tune.springs.frontRateLbIn} lb/in / R ${tune.springs.rearRateLbIn} lb/in`);
    lines.push(`Ride height: F ${tune.springs.frontRideHeightIn} in / R ${tune.springs.rearRideHeightIn} in`);
    lines.push(`Damping: rebound F ${tune.damping.frontReboundSetting} / R ${tune.damping.rearReboundSetting}, bump F ${tune.damping.frontBumpSetting} / R ${tune.damping.rearBumpSetting}`);
    lines.push(`Brakes: ${tune.brakes.balanceFrontPercent}% front / ${tune.brakes.pressurePercent}% pressure`);
    const diff = diffRows(tune).map(([label, value]) => `${label} ${value}`).join(', ');
    lines.push(`Diff: ${diff}`);
    lines.push(`Aero: front ${tune.aero.frontRatio === null ? 'not adjustable' : `${tune.aero.frontDownforceLb ?? tune.aero.frontRatio} lb`}, rear ${tune.aero.rearRatio === null ? 'not adjustable' : `${tune.aero.rearDownforceLb ?? tune.aero.rearRatio} lb`}`);
    lines.push(`Gearing: final drive ${tune.gearing.finalDrive.toFixed(2)}, ${tune.gearing.gears.map((g, i) => `G${i + 1} ${g.toFixed(2)}`).join(', ')}`);
    lines.push('');
    lines.push('Notes:');
    tune.notes.forEach((note) => lines.push(`- ${note}`));
    return lines.join('\n');
  }

  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    window.setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  document.addEventListener('DOMContentLoaded', init);
})();

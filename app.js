/* Forza Tune App - UI wiring */
(function () {
  const FT = window.ForzaTune;
  let state = {
    raceType: 'grip',
    surface: 'pavement',
    currentTune: null,
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
        setDefaultTopSpeed();
        generateAndRender();
      });
    });

    $$('.option-chip[data-surface]').forEach((button) => {
      button.addEventListener('click', () => {
        state.surface = button.dataset.surface;
        updateActiveButtons();
        setDefaultTopSpeed();
        generateAndRender();
      });
    });
  }

  function setupFormDefaults() {
    setDefaultTopSpeed();
    updateActiveButtons();

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
      setDefaultTopSpeed();
      updateActiveButtons();
      generateAndRender();
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
      tireCompound: $('#tireCompound').value,
      horsepower: $('#horsepower').value,
      weight: $('#weight').value,
      weightDistribution: $('#weightDistribution').value,
      gearCount: $('#gearCount').value,
      redlineRpm: $('#redlineRpm').value,
      idealTopSpeedMph: $('#idealTopSpeedMph').value,
      tireDiameterInches: $('#tireDiameterInches').value,
      adjustableAero: $('#adjustableAero').checked,
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
          <p>${tune.summary.carClass}-Class ${tune.summary.raceLabel} · ${tune.summary.surfaceLabel} · ${tune.summary.drivetrain}</p>
        </div>
        <div class="speed-badge">
          <span>${tune.summary.idealTopSpeedMph}</span>
          <small>target mph</small>
        </div>
      </section>

      <div class="result-grid">
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
          ['Front setting', `${tune.antiRollBars.frontSetting ?? FT.round(tune.antiRollBars.frontRatio * 100, 1)} (${tune.antiRollBars.frontLabel})`],
          ['Rear setting', `${tune.antiRollBars.rearSetting ?? FT.round(tune.antiRollBars.rearRatio * 100, 1)} (${tune.antiRollBars.rearLabel})`],
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
          <span class="pill">${tune.gearing.gearCount} gears</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Gear</th><th>Ratio</th><th>Redline speed</th></tr>
            </thead>
            <tbody>${gearRows}</tbody>
          </table>
        </div>
        <p class="muted">${tune.gearing.shiftNote}</p>
        <p class="formula">${tune.gearing.formula}</p>
      </section>

      <section class="panel notes-panel">
        <p class="eyebrow">Tuning notes</p>
        <ul>${tune.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul>
      </section>
    `;
  }

  function renderCard(title, rows, note) {
    return `
      <section class="result-card">
        <h3>${title}</h3>
        <dl>
          ${rows.map(([label, value]) => `
            <div>
              <dt>${label}</dt>
              <dd>${value}</dd>
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

  function aeroRows(tune) {
    if (tune.aero.frontRatio === null) {
      return [['Status', 'Not adjustable']];
    }
    return [
      ['Front ratio', tune.aero.frontRatio],
      ['Rear ratio', tune.aero.rearRatio],
    ];
  }

  function renderCorrection(key) {
    const correction = FT.TuningEngine.CORRECTIONS[key];
    if (!correction) return;
    correctionOutput.innerHTML = `
      <h3>${correction.label}</h3>
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
          <span>${tune.summary.carClass} · ${tune.summary.raceLabel} · ${tune.summary.surfaceLabel}</span>
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
    $('#tireCompound').value = saved.summary.tireCompound || 'sport';
    $('#horsepower').value = saved.summary.horsepower;
    $('#weight').value = saved.summary.weight;
    $('#weightDistribution').value = saved.summary.weightDistribution;
    $('#gearCount').value = saved.gearing.gearCount;
    $('#redlineRpm').value = saved.gearing.redlineRpm || $('#redlineRpm').value;
    $('#idealTopSpeedMph').value = saved.summary.idealTopSpeedMph;
    $('#tireDiameterInches').value = saved.gearing.tireDiameterInches || $('#tireDiameterInches').value;
    $('#adjustableAero').checked = saved.aero.frontRatio !== null;
    state.raceType = saved.summary.raceType;
    state.surface = saved.summary.surface;
    updateActiveButtons();
    state.currentTune = saved;
    renderTune(saved);
    showToast('Tune loaded.');
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

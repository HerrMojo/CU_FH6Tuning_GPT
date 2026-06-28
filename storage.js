/* Forza Tune App - local storage */
(function () {
  const FT = (window.ForzaTune = window.ForzaTune || {});
  const KEY = 'forzaTuneApp.savedTunes.v1';

  function getSavedTunes() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch (error) {
      console.warn('Could not read saved tunes', error);
      return [];
    }
  }

  function saveTune(tune) {
    const tunes = getSavedTunes();
    const savedTune = {
      ...tune,
      id: tune.id || `tune-${Date.now()}`,
      savedAt: new Date().toISOString(),
    };
    const withoutExisting = tunes.filter((item) => item.id !== savedTune.id);
    withoutExisting.unshift(savedTune);
    localStorage.setItem(KEY, JSON.stringify(withoutExisting.slice(0, 50)));
    return savedTune;
  }

  function deleteTune(id) {
    const tunes = getSavedTunes().filter((item) => item.id !== id);
    localStorage.setItem(KEY, JSON.stringify(tunes));
    return tunes;
  }

  function clearTunes() {
    localStorage.removeItem(KEY);
  }

  FT.Storage = {
    getSavedTunes,
    saveTune,
    deleteTune,
    clearTunes,
  };
})();

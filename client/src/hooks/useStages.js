import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { stagesFromSettings } from '../constants.js';

export function useStages() {
  const [stages, setStages] = useState(() => stagesFromSettings(null));

  useEffect(() => {
    api.stages().then((s) => setStages(stagesFromSettings(s))).catch(() => {});
  }, []);

  const byKey = Object.fromEntries(stages.map((s) => [s.key, s]));
  return { stages, byKey, setStages };
}

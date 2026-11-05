import type { PersonTagConfig } from '@/types/life-town';
import { loadLifeMemoriesData, saveLifeMemoriesData } from '@/lib/life-memories-persistence';
import { emitPersonTagConfigUpdated } from '@/lib/eco-data-events';

export const EMPTY_PERSON_TAG_CONFIG: PersonTagConfig = {
  customTags: [],
  excludedTags: [],
};

export async function loadPersonTagConfig(): Promise<PersonTagConfig> {
  const data = await loadLifeMemoriesData();
  return data.personTagConfig ?? { ...EMPTY_PERSON_TAG_CONFIG };
}

export async function savePersonTagConfig(config: PersonTagConfig): Promise<void> {
  const data = await loadLifeMemoriesData();
  await saveLifeMemoriesData({ ...data, personTagConfig: config });
  emitPersonTagConfigUpdated();
}

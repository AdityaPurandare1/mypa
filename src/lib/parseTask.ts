import { supabase } from './supabase';
import { parseDrafts, emptyDraft } from './parseDrafts';
import { deviceTimeZone, nowIso } from './time';
import type { TaskDraft } from '@/types';

/**
 * Send a brain-dump to the parse-task edge function and normalize the result
 * into editable drafts. Always resolves — on any error we return a single
 * blank draft so the confirm sheet opens with one row instead of dead-ending.
 *
 * The device timezone + current instant are sent so Claude resolves relative
 * dates ("Thursday", "tomorrow") in the user's local frame.
 */
export async function parseTask(text: string): Promise<TaskDraft[]> {
  try {
    const { data, error } = await supabase.functions.invoke('parse-task', {
      body: {
        text,
        timezone: deviceTimeZone(),
        now: nowIso(),
      },
    });
    if (error) return [emptyDraft()];
    return parseDrafts(data);
  } catch {
    return [emptyDraft()];
  }
}

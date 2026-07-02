// P2 — Web Push subscription helper. NOT wired in P1.
//
// P1 reminders are in-app only (see src/hooks/useDueReminders.ts). This stub
// exists so the server-push path (supabase/functions/send-reminders +
// push_subscriptions table) has a client entry point to fill in later.

// import { supabase } from './supabase';

// The VAPID public key would come from a build-time env var (VITE_VAPID_PUBLIC).
// const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC ?? '';

/**
 * P2: subscribe this device to Web Push and persist the subscription so the
 * server can fan out reminders. Currently a no-op returning false ("not
 * enabled") so callers can feature-test without branching on undefined.
 */
export async function enablePush(): Promise<boolean> {
  // P2 — implementation sketch:
  //
  // if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  // const reg = await navigator.serviceWorker.ready;
  // const sub = await reg.pushManager.subscribe({
  //   userVisibleOnly: true,
  //   applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
  // });
  // const json = sub.toJSON();
  // await supabase.from('push_subscriptions').insert({
  //   endpoint: json.endpoint,
  //   p256dh: json.keys?.p256dh,
  //   auth: json.keys?.auth,
  //   user_agent: navigator.userAgent,
  // }); // user_id filled by DB default auth.uid()
  // return true;
  return false;
}

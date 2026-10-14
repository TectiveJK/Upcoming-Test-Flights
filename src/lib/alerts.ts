import "./base64url-polyfill";
import { sendPushMessage } from "../../vendor/web-push/index.js";
import { writeDocument, readDocument } from "@/lib/document-store";
import { bytesFromBase64Url } from "@/lib/base64url-polyfill";
import {
  serviceWorkerScope,
  serviceWorkerUrl,
  sharedBoardUrl,
  subscriptionsUrl,
  vapidContact,
  vapidKeys,
} from "@/lib/push-config";
import { remoteBoardUrl } from "@/lib/remote-board";
import { kindLabel, type Entry } from "@/lib/schedule";

const MAX_SUBSCRIPTIONS = 100;

type StoredSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  updatedAt: string;
};

type SubscriptionFile = {
  subscriptions: StoredSubscription[];
  version: number;
};

function isSubscription(value: unknown): value is StoredSubscription {
  if (!value || typeof value !== "object") return false;
  const record = value as StoredSubscription;
  return (
    typeof record.endpoint === "string" &&
    record.endpoint.startsWith("https://") &&
    typeof record.keys?.p256dh === "string" &&
    typeof record.keys?.auth === "string"
  );
}

async function readSubscriptionFile(): Promise<SubscriptionFile> {
  const body = await readDocument<Partial<SubscriptionFile>>(subscriptionsUrl);
  const subscriptions = Array.isArray(body.subscriptions)
    ? body.subscriptions.filter(isSubscription)
    : [];
  return {
    subscriptions,
    version: Number(body.version) || 0,
  };
}

function sameSubscriptions(left: StoredSubscription[], right: StoredSubscription[]): boolean {
  if (left.length !== right.length) return false;
  const byEndpoint = new Map(right.map((item) => [item.endpoint, item]));
  return left.every((item) => {
    const other = byEndpoint.get(item.endpoint);
    return other?.keys.p256dh === item.keys.p256dh && other.keys.auth === item.keys.auth;
  });
}

async function updateSubscriptions(
  change: (subscriptions: StoredSubscription[]) => StoredSubscription[],
): Promise<void> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let current: SubscriptionFile;
    try {
      current = await readSubscriptionFile();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Alerts could not be saved.");
      continue;
    }
    const subscriptions = change(current.subscriptions).slice(-MAX_SUBSCRIPTIONS);
    try {
      await writeDocument(
        subscriptionsUrl,
        JSON.stringify({ subscriptions, version: current.version + 1 }),
      );
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Alerts could not be saved.");
      continue;
    }
    for (let check = 0; check < 5; check += 1) {
      try {
        const saved = await readSubscriptionFile();
        if (sameSubscriptions(saved.subscriptions, subscriptions)) return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Alerts could not be saved.");
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw lastError ?? new Error("Alerts could not be saved.");
}

export function isIosDevice(): boolean {
  const userAgent = navigator.userAgent;
  return (
    /iphone|ipad|ipod/i.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isStandaloneDisplay(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true
  );
}

export function alertsNeedInstall(): boolean {
  return isIosDevice() && !isStandaloneDisplay();
}

export function alertsSupported(): boolean {
  return (
    window.isSecureContext &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function registration(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register(serviceWorkerUrl, { scope: serviceWorkerScope });
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<ServiceWorkerRegistration>((_, reject) => {
      window.setTimeout(() => reject(new Error("Notifications did not start.")), 8000);
    }),
  ]);
}

async function currentEndpoint(): Promise<string | null> {
  if (!("serviceWorker" in navigator)) return null;
  const current = await navigator.serviceWorker.getRegistration(serviceWorkerScope);
  const subscription = await current?.pushManager.getSubscription();
  return subscription?.endpoint ?? null;
}

export async function alertsEnabled(): Promise<boolean> {
  if (!alertsSupported() || Notification.permission !== "granted") return false;
  return Boolean(await currentEndpoint());
}

export async function enableAlerts(): Promise<void> {
  if (!remoteBoardUrl()) throw new Error("Alerts are only on the shared board.");
  if (!alertsSupported()) throw new Error("This browser cannot show lock-screen alerts.");
  if (alertsNeedInstall()) {
    throw new Error("Add the board to the iPhone home screen, then open it from the icon.");
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notifications are blocked for this phone.");
  }
  const worker = await registration();
  const existing = await worker.pushManager.getSubscription();
  const subscription =
    existing ??
    (await worker.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: Uint8Array.from(bytesFromBase64Url(vapidKeys.publicKey)),
    }));
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new Error("This phone did not allow notifications.");
  }
  const next: StoredSubscription = {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    updatedAt: new Date().toISOString(),
  };
  await updateSubscriptions((subscriptions) => [
    ...subscriptions.filter((item) => item.endpoint !== next.endpoint),
    next,
  ]);
}

export async function disableAlerts(): Promise<void> {
  const worker = await navigator.serviceWorker.getRegistration(serviceWorkerScope);
  const subscription = await worker?.pushManager.getSubscription();
  const endpoint = subscription?.endpoint;
  if (subscription) await subscription.unsubscribe();
  if (!endpoint) return;
  await updateSubscriptions((subscriptions) =>
    subscriptions.filter((item) => item.endpoint !== endpoint),
  );
}

function alertBody(entry: Entry): string {
  const [year, month, day] = entry.date.split("-").map(Number);
  const written = new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const note = entry.notes ? ` · ${entry.notes}` : "";
  return `${entry.title} · ${written}, ${entry.time}${note}`.slice(0, 180);
}

export async function notifyAdded(entry: Entry): Promise<void> {
  if (!remoteBoardUrl()) return;
  const file = await readSubscriptionFile();
  if (file.subscriptions.length === 0) return;
  const mine = await currentEndpoint().catch(() => null);
  const targets = file.subscriptions.filter((item) => item.endpoint !== mine);
  const expired: string[] = [];
  await Promise.all(
    targets.map(async (target) => {
      try {
        const response = await sendPushMessage({
          applicationServerKeys: vapidKeys,
          adminContact: vapidContact,
          target,
          urgency: "high",
          ttl: 12 * 60 * 60,
          payload: JSON.stringify({
            title: `New ${kindLabel(entry.kind).toLowerCase()}`,
            body: alertBody(entry),
            url: sharedBoardUrl,
          }),
        });
        if (response.status === 404 || response.status === 410) expired.push(target.endpoint);
      } catch {
        // One phone failing must not stop the others, or the saved entry.
      }
    }),
  );
  if (expired.length === 0) return;
  await updateSubscriptions((subscriptions) =>
    subscriptions.filter((item) => !expired.includes(item.endpoint)),
  ).catch(() => undefined);
}

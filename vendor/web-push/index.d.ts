export type ApplicationServerKeys = {
  publicKey: string;
  privateKey: string;
};

export type PushTarget = {
  endpoint: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

export function sendPushMessage(options: {
  applicationServerKeys: ApplicationServerKeys;
  payload?: string | Uint8Array;
  target: PushTarget;
  adminContact?: string;
  ttl?: number;
  urgency?: "very-low" | "low" | "normal" | "high";
  topic?: string;
}): Promise<Response>;

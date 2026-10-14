"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  alertsEnabled,
  alertsNeedInstall,
  alertsSupported,
  disableAlerts,
  enableAlerts,
} from "@/lib/alerts";
import { remoteBoardUrl } from "@/lib/remote-board";

type Mode = "unknown" | "on" | "off" | "ios" | "unsupported" | "denied" | "error";

export function AlertToggle() {
  const shared = Boolean(remoteBoardUrl());
  const [mode, setMode] = useState<Mode>("unknown");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!shared) return;
    let cancelled = false;
    const detect = async () => {
      if (!alertsSupported()) {
        if (!cancelled) setMode("unsupported");
        return;
      }
      if (alertsNeedInstall()) {
        if (!cancelled) setMode("ios");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setMode("denied");
        return;
      }
      const enabled = await alertsEnabled().catch(() => false);
      if (!cancelled) setMode(enabled ? "on" : "off");
    };
    void detect();
    return () => {
      cancelled = true;
    };
  }, [shared]);

  async function onEnable() {
    setWorking(true);
    setMessage("");
    try {
      await enableAlerts();
      setMode("on");
    } catch (error) {
      const text = error instanceof Error ? error.message : "Alerts could not be turned on.";
      if (text.includes("home screen")) setMode("ios");
      else if (text.includes("blocked")) setMode("denied");
      else if (text.includes("cannot show")) setMode("unsupported");
      else {
        setMode("error");
        setMessage(text);
      }
    } finally {
      setWorking(false);
    }
  }

  async function onDisable() {
    setWorking(true);
    setMessage("");
    try {
      await disableAlerts();
      setMode("off");
    } catch (error) {
      setMode("error");
      setMessage(error instanceof Error ? error.message : "Alerts could not be turned off.");
    } finally {
      setWorking(false);
    }
  }

  if (!shared) {
    return (
      <p className="text-sm leading-6 text-muted-foreground">
        Phone alerts are part of the shared board. A private copy on this computer
        does not send them.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-6 text-muted-foreground">
        Each person turns this on once, on their own phone. After that, a new
        flight or test notifies that phone even when it is locked. The person
        who added it is not notified on that same phone.
      </p>
      {mode === "on" ? (
        <p role="status" className="text-sm font-medium text-primary">
          Alerts are on for this phone.
        </p>
      ) : null}
      {mode === "ios" ? (
        <p role="status" className="text-sm leading-6">
          On an iPhone, add this page to the home screen and open it from the
          icon. Then tap Turn on alerts. A Safari tab cannot reach a locked
          phone.
        </p>
      ) : null}
      {mode === "denied" ? (
        <p role="status" className="text-sm leading-6">
          Notifications are blocked. Allow them for Flights &amp; tests in the
          phone settings, then open the board again.
        </p>
      ) : null}
      {mode === "unsupported" ? (
        <p role="status" className="text-sm leading-6">
          This browser cannot show lock-screen alerts. Use Chrome on Android,
          or the home-screen app on an iPhone with iOS 16.4 or newer.
        </p>
      ) : null}
      {mode === "error" ? (
        <p role="alert" className="text-sm text-destructive">
          {message || "Alerts could not be changed."}
        </p>
      ) : null}
      {mode === "on" ? (
        <Button
          type="button"
          variant="outline"
          className="h-11 w-fit px-4"
          disabled={working}
          onClick={() => void onDisable()}
        >
          {working ? "Turning off…" : "Turn alerts off"}
        </Button>
      ) : mode === "denied" || mode === "unsupported" ? null : (
        <Button
          type="button"
          className="h-11 w-fit px-4"
          disabled={working}
          onClick={() => void onEnable()}
        >
          {working ? "Turning on…" : "Turn on alerts"}
        </Button>
      )}
    </div>
  );
}

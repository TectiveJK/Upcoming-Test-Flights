"use client";

import { useEffect } from "react";
import { serviceWorkerScope, serviceWorkerUrl } from "@/lib/push-config";

export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (window.location.hostname !== "tectivejk.github.io") return;
    void navigator.serviceWorker.register(serviceWorkerUrl, { scope: serviceWorkerScope });
  }, []);

  return null;
}

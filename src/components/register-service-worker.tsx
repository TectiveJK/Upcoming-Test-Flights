"use client";

import { useEffect } from "react";

export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host.endsWith("extendsclass.com")) return;
    void navigator.serviceWorker.register("/sw.js");
  }, []);

  return null;
}

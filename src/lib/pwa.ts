let swRegistrationPromise: Promise<ServiceWorkerRegistration> | null = null;

export async function registerOrbitaServiceWorker() {
  if (typeof window === "undefined") {
    throw new Error("Service worker registration is only available in browser context.");
  }

  if (!("serviceWorker" in navigator)) {
    throw new Error("Service workers are not supported in this browser.");
  }

  if (!swRegistrationPromise) {
    swRegistrationPromise = navigator.serviceWorker.register("/sw.js");
  }

  return swRegistrationPromise;
}

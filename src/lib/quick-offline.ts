export async function prepareQuickOffline(): Promise<boolean> {
  if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator))
    return false;
  try {
    await navigator.serviceWorker.register("/quick-sw.js");
    const registration = await navigator.serviceWorker.ready;
    const urls = [
      ...document.querySelectorAll<HTMLScriptElement>("script[src]"),
    ].map((s) => s.src);
    const images = [...document.querySelectorAll<HTMLImageElement>("img")].map(
      (img) => img.currentSrc || img.src,
    );
    urls.push(
      ...[
        ...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
      ].map((l) => l.href),
      "/art/game-watchtower.webp",
      "/art/characters-armory.webp",
      "/art/paper-grain.svg",
      "/art/welcome-forest.webp",
      "/brand/root-helper-light.webp",
    );
    return await new Promise<boolean>((resolve) => {
      const channel = new MessageChannel();
      const timeout = window.setTimeout(() => {
        channel.port1.close();
        resolve(false);
      }, 20000);
      channel.port1.onmessage = (event) => {
        window.clearTimeout(timeout);
        channel.port1.close();
        resolve(event.data?.ready === true);
      };
      registration.active?.postMessage(
        { type: "CACHE_QUICK_ASSETS", urls, images },
        [channel.port2],
      );
    });
  } catch {
    return false;
  }
}

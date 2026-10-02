export type ExternalUrlPlatform = "ios" | "android" | "web";
export type ExternalUrlOpener = (url: string) => void | Promise<void>;

export interface ExternalUrlAdapters {
  readonly platform: ExternalUrlPlatform;
  readonly desktopOpen?: ExternalUrlOpener;
  readonly browserOpen: ExternalUrlOpener;
  readonly nativeOpen: ExternalUrlOpener;
}

export async function openExternalHttpUrl(value: string, adapters: ExternalUrlAdapters): Promise<void> {
  if (!isHttpUrl(value)) throw new Error("Only HTTP and HTTPS links can be opened.");
  if (adapters.platform === "web") {
    await (adapters.desktopOpen ?? adapters.browserOpen)(value);
    return;
  }
  await adapters.nativeOpen(value);
}

function isHttpUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

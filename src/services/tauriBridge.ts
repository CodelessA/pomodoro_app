import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

export async function minimizeWindow(): Promise<void> {
  try {
    await invoke("minimize_window");
  } catch {
    try {
      const win = getCurrentWindow();
      await win.minimize();
    } catch (e) {
      console.warn("Failed to minimize window:", e);
    }
  }
}

export async function closeWindow(): Promise<void> {
  try {
    await invoke("close_window");
  } catch {
    try {
      const win = getCurrentWindow();
      await win.close();
    } catch (e) {
      console.warn("Failed to close window:", e);
    }
  }
}

export async function setAlwaysOnTop(alwaysOnTop: boolean): Promise<boolean> {
  try {
    await invoke("toggle_always_on_top", { alwaysOnTop });
    return alwaysOnTop;
  } catch {
    try {
      const win = getCurrentWindow();
      await win.setAlwaysOnTop(alwaysOnTop);
      return alwaysOnTop;
    } catch (e) {
      console.warn("Failed to set always on top:", e);
      return false;
    }
  }
}

export async function startDragging(): Promise<void> {
  try {
    const win = getCurrentWindow();
    await win.startDragging();
  } catch (e) {
    console.warn("Failed to start dragging window:", e);
  }
}

export async function notifyTimerDone(title: string, body: string): Promise<void> {
  try {
    let granted = await isPermissionGranted();
    if (!granted) {
      const permission = await requestPermission();
      granted = permission === "granted";
    }

    if (granted) {
      sendNotification({
        title,
        body,
      });
      return;
    }
  } catch (e) {
    console.warn("Tauri notification error:", e);
  }

  // Fallback to Web Notification API if running in browser/webview fallback
  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "granted") {
      new Notification(title, { body });
    } else if (Notification.permission !== "denied") {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        new Notification(title, { body });
      }
    }
  }
}

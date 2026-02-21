import "@testing-library/jest-dom/vitest";
import { beforeEach, vi } from "vitest";

class MockNotification {
  static permission: NotificationPermission = "default";

  static requestPermission = vi.fn(async () => {
    MockNotification.permission = "granted";
    return MockNotification.permission;
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_title: string, _options?: NotificationOptions) {
    return;
  }
}

vi.stubGlobal("Notification", MockNotification);
Object.defineProperty(HTMLMediaElement.prototype, "load", {
  configurable: true,
  value: vi.fn()
});
Object.defineProperty(HTMLMediaElement.prototype, "play", {
  configurable: true,
  value: vi.fn(async () => undefined)
});

beforeEach(() => {
  localStorage.clear();
  MockNotification.permission = "default";
  MockNotification.requestPermission.mockClear();
  const loadMock = HTMLMediaElement.prototype.load as unknown as { mockClear?: () => void };
  loadMock.mockClear?.();
  const playMock = HTMLMediaElement.prototype.play as unknown as { mockClear?: () => void };
  playMock.mockClear?.();
});

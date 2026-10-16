import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeStore } from "@/lib/redux/store";
import Home from "./page";

const { getCurrentUserMock, chatWorkspaceMock, connectSocketMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  chatWorkspaceMock: vi.fn(() => createElement("div", { "data-testid": "private-chat-workspace" }, "Private chat")),
  connectSocketMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: getCurrentUserMock,
  buildGoogleAuthUrl: vi.fn(() => "https://api.example.com/api/v1/auth/google"),
  logoutUser: vi.fn(),
}));

vi.mock("@/components/chat/chat-workspace", () => ({
  ChatWorkspace: chatWorkspaceMock,
}));

vi.mock("@/lib/socket", () => ({
  connectSocket: connectSocketMock,
  disconnectSocket: vi.fn(),
}));

let root: Root | undefined;
let container: HTMLDivElement | undefined;
let queryClient: QueryClient | undefined;

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  queryClient?.clear();
  root = undefined;
  container = undefined;
  queryClient = undefined;
  getCurrentUserMock.mockReset();
  chatWorkspaceMock.mockClear();
  connectSocketMock.mockClear();
});

async function renderHome(): Promise<void> {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  await act(async () => {
    root?.render(
      <Provider store={makeStore()}>
        <QueryClientProvider client={queryClient!}>
          <Home />
        </QueryClientProvider>
      </Provider>,
    );
    await Promise.resolve();
    const sessionLookup = getCurrentUserMock.mock.results[0]?.value as Promise<unknown> | undefined;
    if (sessionLookup) await sessionLookup;
    await Promise.resolve();
  });
}

describe("public landing page", () => {
  it("offers sign-in entry points without mounting private chat", async () => {
    await renderHome();
    await vi.waitFor(() => expect(container?.textContent).toContain("Start a conversation"));

    expect(container?.querySelector('[data-testid="private-chat-workspace"]')).toBeNull();
    expect(chatWorkspaceMock).not.toHaveBeenCalled();
    expect(connectSocketMock).not.toHaveBeenCalled();
  });

  it("links to the dedicated sign-in route", async () => {
    await renderHome();
    expect(container?.querySelector('a[href="/signin"]')).not.toBeNull();
    expect(chatWorkspaceMock).not.toHaveBeenCalled();
  });
});

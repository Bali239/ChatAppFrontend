import { act } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import Providers from "./providers";

describe("application providers", () => {
  it("hydrates without React mismatch warnings", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const container = document.createElement("div");
    document.body.append(container);
    const tree = (
      <Providers>
        <main>Provider hydration</main>
      </Providers>
    );
    container.innerHTML = renderToString(tree);

    let root: Root | undefined;
    await act(async () => {
      root = hydrateRoot(container, tree);
    });

    expect(consoleError).not.toHaveBeenCalled();

    await act(async () => root?.unmount());
    container.remove();
    consoleError.mockRestore();
  });
});
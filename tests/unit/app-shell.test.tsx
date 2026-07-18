import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RootLayout from "@/app/layout";

describe("RootLayout", () => {
  it("renders the application shell", () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <div>child content</div>
      </RootLayout>,
    );

    expect(html).toContain("site-body");
    expect(html).toContain("child content");
  });
});

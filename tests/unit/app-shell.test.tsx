import { renderToStaticMarkup } from "react-dom/server";
import RootLayout from "@/app/layout";

describe("RootLayout", () => {
  it("renders the application title shell", () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <div>child content</div>
      </RootLayout>,
    );

    expect(html).toContain("Quero Correcao");
    expect(html).toContain("child content");
  });
});

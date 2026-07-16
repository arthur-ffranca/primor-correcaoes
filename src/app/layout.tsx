import type { ReactNode } from "react";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <header>Quero Correcao</header>
        <main>{children}</main>
      </body>
    </html>
  );
}

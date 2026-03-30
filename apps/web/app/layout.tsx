import { Geist, Geist_Mono, Inter } from "next/font/google";
import type { ReactNode } from "react";

import "@workspace/ui/globals.css";
import { cn } from "@workspace/ui/lib/utils";
import { Providers } from "@/components/providers";

const interHeading = Inter({ subsets: ["latin"], variable: "--font-heading" });

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const RootLayout = ({
  children,
}: Readonly<{
  children: ReactNode;
}>) => (
  <html lang="en" suppressHydrationWarning>
    <body
      className={cn(
        geist.variable,
        interHeading.variable,
        fontMono.variable,
        "font-sans antialiased"
      )}
    >
      <Providers>{children}</Providers>
    </body>
  </html>
);

export default RootLayout;

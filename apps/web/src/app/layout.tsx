import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { ColorSchemeScript, MantineProvider, createTheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-store";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"] });

const theme = createTheme({
  primaryColor: "teal",
  defaultRadius: "md",
  fontFamily: `${spaceGrotesk.style.fontFamily}, Segoe UI, sans-serif`,
  headings: {
    fontFamily: `${spaceGrotesk.style.fontFamily}, Segoe UI, sans-serif`,
  },
});

export const metadata: Metadata = {
  title: "Atlas SaaS",
  description: "Production-style multi-tenant SaaS portfolio project",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
      </head>
      <body className={spaceGrotesk.className}>
        <MantineProvider defaultColorScheme="dark" theme={theme}>
          <AuthProvider>
            <Notifications position="top-right" zIndex={1000} />
            {children}
          </AuthProvider>
        </MantineProvider>
      </body>
    </html>
  );
}

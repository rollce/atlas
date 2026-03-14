import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider, createTheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@/app/globals.css";
import { AppRouter } from "@/router";
import { AuthProvider } from "@/lib/auth-store";

const theme = createTheme({
  primaryColor: "teal",
  defaultRadius: "md",
  fontFamily: "Space Grotesk, Segoe UI, sans-serif",
  headings: {
    fontFamily: "Space Grotesk, Segoe UI, sans-serif",
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MantineProvider defaultColorScheme="dark" theme={theme}>
      <AuthProvider>
        <Notifications position="top-right" zIndex={1000} />
        <AppRouter />
      </AuthProvider>
    </MantineProvider>
  </React.StrictMode>,
);

import type { ReactNode } from "react";
import { AtlasShell } from "@/components/atlas-shell";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return <AtlasShell>{children}</AtlasShell>;
}

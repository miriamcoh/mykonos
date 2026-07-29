import type { ReactNode } from "react";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-santorini-fog flex flex-col">
      <Header title={title} />
      <main className="flex-1 px-4 pt-4 pb-28 max-w-md w-full mx-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

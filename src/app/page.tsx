"use client";

import { useState } from "react";
import { RoomCreate } from "@/components/RoomCreate";
import { RoomJoin } from "@/components/RoomJoin";
import { useAuth } from "@/components/AuthProvider";
import { SetupRequired } from "@/components/SetupRequired";

export default function HomePage() {
  const [mode, setMode] = useState<"create" | "join">("create");
  const { loading, authError, isConfigured } = useAuth();

  if (!isConfigured || authError) {
    return <SetupRequired error={authError} />;
  }

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-coral-200 border-t-coral-500 rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <div className="text-center mb-10">
        <h1 className="font-serif text-4xl sm:text-5xl text-warm-800 mb-3">
          theldr booth
        </h1>
        <p className="text-warm-600 max-w-sm mx-auto leading-relaxed">
          Take synchronized photos together, even when you&apos;re miles apart.
        </p>
      </div>

      <div className="flex rounded-2xl bg-warm-200/60 p-1 mb-8 w-full max-w-sm">
        <button
          onClick={() => setMode("create")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            mode === "create"
              ? "bg-cream text-warm-800 shadow-sm"
              : "text-warm-600"
          }`}
        >
          Create room
        </button>
        <button
          onClick={() => setMode("join")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            mode === "join"
              ? "bg-cream text-warm-800 shadow-sm"
              : "text-warm-600"
          }`}
        >
          Join room
        </button>
      </div>

      {mode === "create" ? <RoomCreate /> : <RoomJoin />}
    </main>
  );
}

"use client";

import { useState } from "react";

export default function Page() {
  const [view, setView] = useState(1);

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        <div className="flex gap-2">
          <button onClick={() => setView(1)} className="px-3 py-2 bg-zinc-800 rounded">Trust</button>
          <button onClick={() => setView(2)} className="px-3 py-2 bg-zinc-800 rounded">Doctor</button>
          <button onClick={() => setView(3)} className="px-3 py-2 bg-zinc-800 rounded">Learn</button>
        </div>

        {view === 1 && (
          <div className="space-y-4">
            <h1 className="text-4xl font-bold">Джек</h1>
            <p className="text-zinc-400">Симптом → Диагноз → Объяснение</p>
            <input className="w-full p-4 bg-zinc-900 rounded-xl" placeholder="Что с машиной?" />
            <button className="w-full p-4 bg-white text-black rounded-xl">Получить</button>
          </div>
        )}

        {view === 2 && (
          <div className="space-y-4">
            <h1 className="text-4xl font-bold">Джек</h1>
            <p className="text-zinc-400">Как врач для авто</p>
            <textarea className="w-full p-4 bg-zinc-900 rounded-xl min-h-[120px]" />
            <button className="w-full p-4 bg-emerald-500 text-black rounded-xl">Анализ</button>
          </div>
        )}

        {view === 3 && (
          <div className="space-y-4">
            <h1 className="text-4xl font-bold">Джек</h1>
            <p className="text-zinc-400">Понимание машины</p>
            <input className="w-full p-4 bg-zinc-900 rounded-xl" />
            <div className="grid grid-cols-3 gap-2">
              <div className="p-4 bg-zinc-900 rounded">Симптом</div>
              <div className="p-4 bg-zinc-900 rounded">Причина</div>
              <div className="p-4 bg-zinc-900 rounded">Решение</div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

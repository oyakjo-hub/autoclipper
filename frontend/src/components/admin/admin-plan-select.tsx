"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AdminPlanSelectProps {
  userId: string;
  currentPlan: string;
}

export function AdminPlanSelect({ userId, currentPlan }: AdminPlanSelectProps) {
  const [plan, setPlan] = useState(currentPlan);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedPlan = e.target.value;
    setPlan(selectedPlan);
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/users/${userId}/plan`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: selectedPlan }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Gagal memperbarui paket");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      setPlan(currentPlan); // revert
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <select
        value={plan}
        onChange={handleChange}
        disabled={isLoading}
        className="bg-white border border-gray-300 rounded px-2.5 py-1 text-xs font-medium text-gray-700 outline-none focus:border-gray-500 disabled:opacity-50 cursor-pointer"
      >
        <option value="free">Free / Trial</option>
        <option value="pro">Pro (Free Access)</option>
        <option value="scale">Scale (Free Access)</option>
      </select>
      {error && <span className="text-[10px] text-red-600 font-semibold">{error}</span>}
    </div>
  );
}

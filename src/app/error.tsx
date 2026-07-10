"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="max-w-sm text-center flex flex-col items-center gap-3">
        <AlertTriangle size={22} className="text-berat" />
        <div>
          <p className="text-sm text-text-primary">Terjadi kesalahan.</p>
          <p className="text-xs text-text-secondary mt-1">{error.message}</p>
        </div>
        <Button variant="primary" onClick={reset}>
          Coba lagi
        </Button>
      </div>
    </div>
  );
}

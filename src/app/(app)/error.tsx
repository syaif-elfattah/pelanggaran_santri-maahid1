"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
    <div className="flex items-center justify-center py-16">
      <Card className="max-w-md flex flex-col items-center text-center gap-3">
        <AlertTriangle size={22} className="text-berat" />
        <div>
          <p className="text-sm text-text-primary">Halaman ini gagal dimuat.</p>
          <p className="text-xs text-text-secondary mt-1">{error.message}</p>
        </div>
        <Button variant="primary" onClick={reset}>
          Coba lagi
        </Button>
      </Card>
    </div>
  );
}

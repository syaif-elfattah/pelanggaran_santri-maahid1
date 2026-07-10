import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex items-center justify-center gap-2 py-24 text-text-secondary text-sm">
      <Loader2 size={16} className="animate-spin" />
      Memuat halaman...
    </div>
  );
}

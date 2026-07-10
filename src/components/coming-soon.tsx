import { Construction } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ComingSoon({ phase }: { phase: string }) {
  return (
    <Card className="flex flex-col items-center justify-center py-16 text-center gap-2">
      <Construction size={22} className="text-text-muted mb-1" />
      <p className="text-sm text-text-primary">Halaman ini belum dibangun.</p>
      <p className="text-xs text-text-secondary max-w-xs">
        Menyusul di tahap pengerjaan berikutnya, sesuai urutan yang sudah direncanakan.
      </p>
      <Badge severity="neutral" className="mt-1">{phase}</Badge>
    </Card>
  );
}

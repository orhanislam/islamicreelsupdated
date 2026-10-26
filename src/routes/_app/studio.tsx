import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { VirtualStudioOffice } from "@/components/VirtualStudioOffice";
import { confirmAndGenerateVideo } from "@/lib/assistant.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/studio")({
  component: StudioPage,
});

function StudioPage() {
  const navigate = useNavigate();

  const handleStartRender = async (proposal: any) => {
    try {
      toast.info("🚀 Стартиране на рендиране от студиото...");
      const res = await confirmAndGenerateVideo({ data: { proposal } });
      toast.success("Видеото се рендира успешно на сървъра!");
      if (res?.jobId) {
        navigate({ to: "/history" });
      }
    } catch (err: any) {
      toast.error(err?.message || "Грешка при стартиране на рендирането");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-2 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <VirtualStudioOffice onStartRender={handleStartRender} />
      </div>
    </div>
  );
}

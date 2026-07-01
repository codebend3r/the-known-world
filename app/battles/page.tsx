import type { Metadata } from "next";
import { ParchmentLayout } from "@/components/ParchmentLayout";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export const metadata: Metadata = {
  title: "Battles · Atlas of the Known World",
  description: "The Battles section of the atlas — coming soon.",
};

export default function BattlesPage() {
  return (
    <ParchmentLayout>
      <ComingSoonPage title="Battles" />
    </ParchmentLayout>
  );
}

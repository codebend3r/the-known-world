import type { Metadata } from "next";
import { ParchmentLayout } from "@/components/ParchmentLayout";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export const metadata: Metadata = {
  title: "Timeline · Atlas of the Known World",
  description: "The Timeline section of the atlas — coming soon.",
};

export default function TimelinePage() {
  return (
    <ParchmentLayout>
      <ComingSoonPage title="Timeline" />
    </ParchmentLayout>
  );
}

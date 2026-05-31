import { ParchmentLayout } from "@/components/ParchmentLayout";
import { MainMenu } from "@/components/MainMenu";

export default function Home() {
  return (
    <ParchmentLayout>
      <p className="subtitle">Choose a path.</p>
      <MainMenu />
    </ParchmentLayout>
  );
}

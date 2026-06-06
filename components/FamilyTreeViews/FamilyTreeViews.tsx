import type { TreeNode } from "@/lib/family-tree";
import type { LaidOutChart } from "@/lib/family-tree-layout";
import { FamilyTree } from "@/components/FamilyTree";
import { FamilyTreeChart } from "@/components/FamilyTreeChart";
import { FamilyTreeViewSwitcher } from "@/components/FamilyTreeViews/FamilyTreeViewSwitcher";

type Props = {
  roots: TreeNode[];
  chart: LaidOutChart;
  headingId?: string;
};

export function FamilyTreeViews({ roots, chart, headingId }: Props) {
  return (
    <FamilyTreeViewSwitcher
      headingId={headingId}
      list={<FamilyTree roots={roots} />}
      chart={<FamilyTreeChart chart={chart} />}
    />
  );
}

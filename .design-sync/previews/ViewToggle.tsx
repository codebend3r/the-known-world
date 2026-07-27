import { useState } from "react";
import {
  ViewToggle,
  GridIcon,
  ListIcon,
  AllHousesIcon,
  RegionGroupIcon,
} from "game-of-thrones-atlas";

// ViewToggle is a generic controlled segmented control: an `options` array of
// { value, label, icon } plus the current `value` and an `onChange` handler.
// Local state drives each cell so the pressed option shows its selected styling.
export const GridList = () => {
  const [value, setValue] = useState("grid");
  return (
    <ViewToggle
      ariaLabel="View"
      value={value}
      onChange={setValue}
      options={[
        { value: "grid", label: "Grid view", icon: <GridIcon /> },
        { value: "list", label: "List view", icon: <ListIcon /> },
      ]}
    />
  );
};

export const Grouping = () => {
  const [value, setValue] = useState("region");
  return (
    <ViewToggle
      ariaLabel="Group houses"
      value={value}
      onChange={setValue}
      options={[
        { value: "all", label: "All houses", icon: <AllHousesIcon /> },
        {
          value: "region",
          label: "Group by region",
          icon: <RegionGroupIcon />,
        },
      ]}
    />
  );
};

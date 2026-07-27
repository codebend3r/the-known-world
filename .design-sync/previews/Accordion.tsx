import { useState } from "react";
import { Accordion } from "game-of-thrones-atlas";

// Accordion is fully controlled — the consumer owns `open` and `onToggle`.
// These cells drive it with local state so the disclosure is live.
export const Expanded = () => {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ width: "30rem" }}>
      <Accordion
        id="great-houses"
        title="Great Houses of Westeros"
        count={9}
        open={open}
        onToggle={() => setOpen((o) => !o)}
      >
        <p style={{ margin: 0 }}>
          The nine paramount houses hold dominion over the regions of the Seven
          Kingdoms, each sworn (in name) to the Iron Throne.
        </p>
      </Accordion>
    </div>
  );
};

export const Collapsed = () => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ width: "30rem" }}>
      <Accordion
        id="battles"
        title="Battles of the War of the Five Kings"
        count={14}
        open={open}
        onToggle={() => setOpen((o) => !o)}
      >
        <p style={{ margin: 0 }}>Concealed until the panel is opened.</p>
      </Accordion>
    </div>
  );
};

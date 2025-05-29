import { useState } from "react";
import "./HelpTooltip.css";

export default function HelpTooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <span
      className="help-tooltip"
      onClick={() => setVisible(!visible)}
      onBlur={() => setVisible(false)}
      tabIndex={0}
    >
      ⓘ
      {visible && <span className="tooltip-bubble">{text}</span>}
    </span>
  );
}
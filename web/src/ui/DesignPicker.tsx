import { useStore } from "../app/store";
import { go } from "../app/router";
import { DESIGNS, canUse, chooseDesign } from "../app/themes";
import { toast } from "./kit";

/** Every design as a tiny window: sidebar, title, a panel and its button. */
export function DesignPicker({ onPicked }: { onPicked?: () => void }) {
  const current = useStore((s) => s.theme);
  useStore((s) => s.bonds.held.length);
  return (
    <div className="designs">
      {DESIGNS.map((d) => {
        const [chrome, page, panel, text, accent] = d.swatch;
        const locked = !canUse(d);
        return (
          <button
            key={d.id}
            className={`design ${current === d.id ? "is-on" : ""} ${locked ? "is-locked" : ""}`}
            aria-pressed={current === d.id}
            onClick={() => {
              if (locked) {
                toast("Gilded comes with any server bond.");
                go("treasury");
                onPicked?.();
                return;
              }
              chooseDesign(d.id);
              onPicked?.();
            }}
          >
            <span className="design-mock" aria-hidden="true" style={{ background: page }}>
              <span className="dm-side" style={{ background: chrome }}>
                <i style={{ background: accent }} /><i style={{ background: text }} /><i style={{ background: text }} /><i style={{ background: text }} />
              </span>
              <span className="dm-main">
                <span className="dm-title" style={{ color: text, fontFamily: d.font }}>{d.name}</span>
                <span className="dm-panel" style={{ background: panel }}><span className="dm-btn" style={{ background: accent }} /></span>
              </span>
            </span>
            <span className="design-name"><b>{d.name}</b>{locked ? <span className="design-lock">bondholders</span> : current === d.id ? <span className="design-lock">in use</span> : null}</span>
            <span className="design-line">{d.line}</span>
          </button>
        );
      })}
    </div>
  );
}

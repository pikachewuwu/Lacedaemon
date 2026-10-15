import { useState } from "react";
import { addCards, setState, useStore } from "../app/store";
import { openPack } from "../games/spirits/catalog";
import { defaultRand } from "../games/rng";
import { Modal } from "../ui/kit";
import { PackReveal } from "./Spirits";

/** First sign-in: a free pack, so the collection starts with something. */
export function WelcomePack() {
  const show = useStore((s) => s.signedIn && s.welcomePack);
  const [cards, setCards] = useState<ReturnType<typeof openPack> | null>(null);
  const close = () => {
    setState({ welcomePack: false });
    setCards(null);
  };
  return (
    <Modal open={show} onClose={close} wide label="Welcome">
      <div className="modal-head">
        <span className="label">Welcome</span>
        <h2 className="display" style={{ fontSize: "var(--t-xl)" }}>A pack, on the house</h2>
        <p className="muted">Spirits are cards you collect, trade, and put on the table. Your first pack is free.</p>
      </div>
      <div className="modal-body">
        {cards ? (
          <PackReveal cards={cards} />
        ) : (
          <div className="welcome-pack">
            <button
              className="pack-closed"
              onClick={() => {
                const c = openPack(defaultRand);
                setCards(c);
                addCards(c, "Opened a welcome pack", "pack");
              }}
            >
              <span className="pack-name display">Spirits</span>
              <span className="label">5 cards · tap to open</span>
            </button>
          </div>
        )}
      </div>
      <div className="modal-foot">
        <button className="btn btn-primary" onClick={close}>{cards ? "Done" : "Later"}</button>
      </div>
    </Modal>
  );
}

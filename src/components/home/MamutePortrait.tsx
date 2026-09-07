import { publicAsset } from "../../lib/base";

const MASCOT_FILE = "mamute-mascot.png";
const MASCOT_SIZE = 320;

export function MamutePortrait() {
  return (
    <div className="mamute-portrait">
      <div className="mamute-portrait__float">
        <div className="mamute-portrait__glow" aria-hidden="true" />
        <div className="mamute-portrait__frame">
          <div className="mamute-portrait__media">
            <img
              src={publicAsset(MASCOT_FILE)}
              alt="Mamute DJ com fones e óculos refletindo a pista iluminada por luzes de clube"
              width={MASCOT_SIZE}
              height={MASCOT_SIZE}
              decoding="async"
              fetchPriority="high"
              draggable={false}
            />
            <span className="mamute-portrait__veil" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}

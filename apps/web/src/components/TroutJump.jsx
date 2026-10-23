// Decorative brown trout (Salmo trutta fario) that leaps out of the bottom-right
// corner. Pure CSS animation; hidden from assistive tech and ignores pointer events.
function TroutJump() {
  return (
    <div className="trout-jump" aria-hidden="true">
      <span className="trout-jump__splash trout-jump__splash--in" />
      <span className="trout-jump__splash trout-jump__splash--out" />
      <div className="trout-jump__x">
        <div className="trout-jump__y">
          <svg className="trout-jump__fish" viewBox="0 0 220 90" focusable="false">
            <defs>
              <linearGradient id="trout-body" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#4a3d1c" />
                <stop offset="0.35" stopColor="#8a6a26" />
                <stop offset="0.6" stopColor="#c99a3a" />
                <stop offset="1" stopColor="#f3e3a6" />
              </linearGradient>
              <linearGradient id="trout-fin" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#8a6a2a" />
                <stop offset="1" stopColor="#5a4519" />
              </linearGradient>
            </defs>

            {/* tail */}
            <path
              d="M176 42 C190 34 204 24 214 19 C209 34 209 58 214 75 C204 69 190 60 176 52 Z"
              fill="url(#trout-fin)"
            />
            {/* dorsal fin */}
            <path d="M86 25 C94 8 110 5 123 9 C120 17 118 22 121 28 Z" fill="url(#trout-fin)" />
            {/* adipose fin, orange-tipped as in fario */}
            <path d="M149 32 C153 25 160 24 164 33 Z" fill="#d9692b" />
            {/* anal & pelvic fins */}
            <path d="M138 62 C143 72 151 76 158 75 C156 68 154 64 150 60 Z" fill="#c98a3a" />
            <path d="M103 66 C108 76 117 80 124 79 C120 72 116 68 112 66 Z" fill="#c98a3a" />

            {/* body */}
            <path
              d="M7 47 C19 31 45 23 76 22 C116 21 150 32 180 41 L180 53 C150 62 116 70 76 68 C45 67 19 60 7 50 Z"
              fill="url(#trout-body)"
            />

            {/* pectoral fin */}
            <path d="M42 59 C48 70 58 76 67 76 C62 68 56 62 50 59 Z" fill="#d49a45" opacity="0.9" />

            {/* gill cover */}
            <path d="M38 33 C47 41 47 56 40 64" fill="none" stroke="#3d2f12" strokeWidth="1.6" opacity="0.55" />
            {/* lateral line */}
            <path d="M44 45 C90 43 140 44 178 47" fill="none" stroke="#f6e7b5" strokeWidth="0.8" opacity="0.5" />

            {/* black spots on back and dorsal fin */}
            <g fill="#1d150a">
              <circle cx="58" cy="31" r="2.6" />
              <circle cx="72" cy="27" r="2.2" />
              <circle cx="80" cy="36" r="2.4" />
              <circle cx="96" cy="30" r="2.8" />
              <circle cx="110" cy="27" r="2" />
              <circle cx="114" cy="38" r="2.5" />
              <circle cx="130" cy="31" r="2.3" />
              <circle cx="144" cy="38" r="2" />
              <circle cx="66" cy="40" r="1.8" />
              <circle cx="32" cy="36" r="1.6" />
              <circle cx="98" cy="15" r="1.6" />
              <circle cx="108" cy="11" r="1.4" />
              <circle cx="113" cy="19" r="1.5" />
            </g>
            {/* red spots with pale halos along the flank */}
            <g>
              <circle cx="70" cy="50" r="3.6" fill="#f4ead0" />
              <circle cx="70" cy="50" r="2.2" fill="#c8331f" />
              <circle cx="92" cy="47" r="3.8" fill="#f4ead0" />
              <circle cx="92" cy="47" r="2.3" fill="#c8331f" />
              <circle cx="118" cy="51" r="3.4" fill="#f4ead0" />
              <circle cx="118" cy="51" r="2" fill="#c8331f" />
              <circle cx="140" cy="47" r="3.2" fill="#f4ead0" />
              <circle cx="140" cy="47" r="1.9" fill="#c8331f" />
              <circle cx="104" cy="57" r="2.8" fill="#f4ead0" />
              <circle cx="104" cy="57" r="1.6" fill="#c8331f" />
            </g>

            {/* eye & mouth */}
            <circle cx="24" cy="40" r="4.6" fill="#f2d36b" />
            <circle cx="23.4" cy="40" r="2.6" fill="#120d05" />
            <circle cx="22.5" cy="39" r="0.8" fill="#ffffff" />
            <path d="M8 49 Q17 53 25 50" fill="none" stroke="#3d2f12" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default TroutJump;

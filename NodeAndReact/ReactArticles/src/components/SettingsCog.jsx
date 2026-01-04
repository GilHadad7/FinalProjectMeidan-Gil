// src/components/SettingsCog.jsx
import React, { useEffect, useRef, useState } from "react";
import s from "./SettingsCog.module.css";

export default function SettingsCog({ user, onLogout, onSwitchAccount, onOpenFull }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  // סגירה בלחיצה בחוץ / ESC
  useEffect(() => {
    const onClickOutside = (e) => {
      if (!panelRef.current || !btnRef.current) return;
      if (!panelRef.current.contains(e.target) && !btnRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onEsc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  return (
    <div className={s.wrapper} dir="rtl">
      <button
        ref={btnRef}
        className={s.cogBtn}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="הגדרות"
      >
        ⚙️
      </button>

      {open && (
        <div ref={panelRef} className={s.panel} role="menu">
          {/* כותרת עליונה */}
          <div className={s.header}>
            <div className={s.avatar}>{user?.name?.[0] || "👤"}</div>
            <div className={s.meta}>
              <div className={s.name}>{user?.name || "משתמש"}</div>
              <div className={s.role}>{user?.roleHe || user?.role || "—"}</div>
            </div>
          </div>

          {/* רק הפעולות הפרקטיות */}
          <div className={s.actions} style={{ marginTop: 8 }}>
            <button
              className={s.btn}
              onClick={() => {
                setOpen(false);
                onSwitchAccount?.();
              }}
            >
              החלפת משתמש/חשבון
            </button>

            <button
              className={s.btn}
              onClick={() => {
                setOpen(false);
                onLogout?.();
              }}
            >
              התנתקות
            </button>

          </div>
        </div>
      )}
    </div>
  );
}

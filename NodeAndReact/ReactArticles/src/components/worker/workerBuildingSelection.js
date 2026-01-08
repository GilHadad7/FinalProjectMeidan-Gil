// \src\pages\worker/workerBuildingSelection.js
// הערה: ניהול בחירת בניין לעובד בצורה אחידה בכל הדפים

const WORKER_SELECTED_BUILDING_KEY = "worker_selected_building_v1";

// הערה: קורא את הבניין שנבחר מה-sessionStorage
export function readWorkerSelectedBuilding() {
  try {
    const raw = sessionStorage.getItem(WORKER_SELECTED_BUILDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// הערה: שומר את הבניין שנבחר ב-sessionStorage (כולל all)
export function saveWorkerSelectedBuilding(b) {
  try {
    if (!b) return;
    const payload = {
      building_id: b.building_id === "all" ? "all" : Number(b.building_id),
      name: b.name || "",
      address: b.address || "",
    };
    sessionStorage.setItem(WORKER_SELECTED_BUILDING_KEY, JSON.stringify(payload));
  } catch {}
}

// הערה: מחזיר building_id בצורה אחידה (מספר / "all" / null)
export function getWorkerSelectedBuildingId() {
  const s = readWorkerSelectedBuilding();
  return s?.building_id ?? null;
}

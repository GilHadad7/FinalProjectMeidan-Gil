// src/pages/tenant/ServiceCallsTenantPage.jsx
import React, { useEffect, useState } from "react";
import classes from "./ServiceCallsTenantPage.module.css";
import ServiceCallsTableTenant from "../../components/tenant/ServiceCallsTableTenant";

export default function ServiceCallsTenantPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // לבחירת בניין + פתיחת קריאה
  const [buildings, setBuildings] = useState([]);
  const [form, setForm] = useState({
    building_id: "",
    call_type: "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // שליפת קריאות שירות של הדייר
  const loadRows = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:3000/api/tenant/service-calls", {
        credentials: "include",
      });
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("tenant service-calls fetch failed:", e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // שליפת הבניינים של הדייר
  const loadBuildings = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/tenant/buildings", {
        credentials: "include",
      });
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setBuildings(arr);
      if (arr.length && !form.building_id) {
        setForm((f) => ({ ...f, building_id: String(arr[0].building_id) }));
      }
    } catch (e) {
      console.error("tenant buildings fetch failed:", e);
      setBuildings([]);
    }
  };

  useEffect(() => {
    loadRows();
    loadBuildings();
  }); // חשוב: מערך תלויות ריק למניעת לולאה

  // פתיחת קריאה חדשה
  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.building_id || !form.call_type || !form.description) return;
    try {
      setSubmitting(true);
      const res = await fetch("http://localhost:3000/api/tenant/service-calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      setForm((f) => ({ ...f, call_type: "", description: "" }));
      await loadRows();
    } catch (e) {
      console.error("open service-call failed:", e);
      alert("פתיחת קריאה נכשלה");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={classes.wrap}>
      <h2 className={classes.title}>קריאות שירות — דייר</h2>

      <div className={classes.grid}>
        {/* טבלה (דומה למנהל, אך לקריאה בלבד) */}
        <section className={classes.tableCard}>
          <h3 className={classes.tableTitle}>הקריאות שלי</h3>
          <ServiceCallsTableTenant
            rows={rows}
            loading={loading}
            emptyText="אין קריאות פעילות"
            /* allowEdit={true}  // אם תרצה לאפשר עריכה לדיירים בעתיד */
          />
        </section>

        {/* פתיחת קריאה חדשה */}
        <section className={classes.formCard}>
          <h3>פתיחת קריאת שירות</h3>
          <form onSubmit={onSubmit} className={classes.form}>
            <label>
              בניין
              <select
                value={form.building_id}
                onChange={(e) => setForm((f) => ({ ...f, building_id: e.target.value }))}
              >
                {buildings.map((b) => (
                  <option key={b.building_id} value={b.building_id}>
                    {b.name ?? b.building_name ?? b.building_id}
                  </option>
                ))}
              </select>
            </label>

            <label>
              סוג תקלה / תחום
              <input
                type="text"
                value={form.call_type}
                onChange={(e) => setForm((f) => ({ ...f, call_type: e.target.value }))}
                placeholder="למשל: חשמל, אינסטלציה…"
              />
            </label>

            <label>
              תיאור
              <textarea
                rows="4"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="פרט/י את הבעיה…"
              />
            </label>

            <button
              type="submit"
              disabled={submitting || !form.building_id || !form.call_type || !form.description}
            >
              {submitting ? "פותח…" : "פתיחת קריאה"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

import React, { useMemo, useState } from "react";
import classes from "./PaymentsTableTenant.module.css";
import BaseTable from "../../components/ui/BaseTable";

export default function PaymentsTableTenant({ payments, onEdit, onDelete }) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // 🔐 מזהה הדייר המחובר
  const user = (() => {
    try { return JSON.parse(sessionStorage.getItem("user")) || null; } catch { return null; }
  })();
  const loggedTenantId = user?.user_id ?? user?.id ?? null;

  const canManage = (p) =>
    loggedTenantId != null && String(p?.tenant_id) === String(loggedTenantId);

  function handleChange(e) {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSave(id) {
    const updated = {
      payment_id: id,
      tenant_id: editForm.tenant_id,
      building_id: editForm.building_id,
      payment_date: editForm.payment_date,
      category: editForm.category,
      description: editForm.description,
      amount: Number(editForm.amount),
      status: editForm.status,
    };
    onEdit(updated);
    setEditingId(null);
    setEditForm({});
  }

  function handleCancel() {
    setEditingId(null);
    setEditForm({});
  }

  // === מיון מהחדש לישן ===
  const sortedPayments = useMemo(() => {
    const list = Array.isArray(payments) ? [...payments] : [];
    return list.sort((a, b) => {
      const ta = Date.parse(a.payment_date);
      const tb = Date.parse(b.payment_date);
      if (isNaN(ta) && isNaN(tb)) return 0;
      if (isNaN(ta)) return 1;
      if (isNaN(tb)) return -1;
      return tb - ta;
    });
  }, [payments]);

  return (
    <div className={classes.tableWrapper}>
      <BaseTable
        headers={[
          "שם דייר",
          "שם בניין",
          "סכום",
          "תאריך",
          "קטגוריה",
          "תיאור",
          "סטטוס",
          "פעולות",
        ]}
        plainContainer
        containerStyle={{ background: "transparent", boxShadow: "none", padding: 0 }}
      >
        {sortedPayments.length === 0 ? (
          <tr>
            <td colSpan="8" style={{ textAlign: "center" }}>לא נמצאו תשלומים</td>
          </tr>
        ) : (
          sortedPayments.map((p) => {
            const allow = canManage(p);

            return (
              <tr key={p.payment_id}>
                {editingId === p.payment_id && allow ? (
                  <>
                    {/* מצב עריכה — רק אם allow */}
                    <td>{p.tenant_name}</td>
                    <td>{p.building_name}</td>
                    <td>
                      <input
                        name="amount"
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        value={editForm.amount ?? ""}
                        onChange={handleChange}
                      />
                    </td>
                    <td>
                      <input
                        name="payment_date"
                        type="date"
                        value={editForm.payment_date ?? ""}
                        onChange={handleChange}
                      />
                    </td>
                    <td>
                      <select
                        name="category"
                        value={editForm.category ?? ""}
                        onChange={handleChange}
                        className={classes.selectInput}
                      >
                        <option value="תחזוקת בניין">תחזוקת בניין</option>
                        <option value="ניקיון">ניקיון</option>
                        <option value="שירות מעלית">שירות מעלית</option>
                        <option value="קנס איחור">קנס איחור</option>
                        <option value="אבטחה">אבטחה</option>
                        <option value="אחר">אחר</option>
                      </select>
                    </td>
                    <td>
                      <input
                        name="description"
                        value={editForm.description ?? ""}
                        onChange={handleChange}
                      />
                    </td>
                    <td>
                      <select
                        name="status"
                        value={editForm.status ?? ""}
                        onChange={handleChange}
                      >
                        <option value="שולם">שולם</option>
                        <option value="ממתין">ממתין</option>
                        <option value="חוב">חוב</option>
                      </select>
                    </td>

                    <td className={classes.actionsCell}>
                      <div className={classes.actionsInner}>
                        <button
                          type="button"
                          onClick={() => handleSave(p.payment_id)}
                          className={`${classes.roundBtn} ${classes.saveBtn}`}
                          title="שמור"
                          aria-label="שמור"
                        >
                          <span className={classes.emojiIcon}>💾</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCancel}
                          className={`${classes.roundBtn} ${classes.cancelBtn}`}
                          title="בטל"
                          aria-label="בטל"
                        >
                          <span className={classes.emojiIcon}>❌</span>
                        </button>
                        <span className={`${classes.roundBtn} ${classes.ghost}`} aria-hidden="true" />
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    {/* מצב קריאה */}
                    <td>{p.tenant_name}</td>
                    <td>{p.building_name}</td>
                    <td>{Number(p.amount).toLocaleString()} ₪</td>
                    <td>{new Date(p.payment_date).toLocaleDateString("he-IL")}</td>
                    <td>{p.category}</td>
                    <td>{p.description}</td>
                    <td>
                      <span
                        className={
                          p.status === "שולם"
                            ? classes.statusPaid
                            : p.status === "חוב"
                            ? classes.statusDebt
                            : classes.statusPending
                        }
                      >
                        {p.status}
                      </span>
                    </td>

                    {/* פעולות — רק על תשלום של הדייר המחובר */}
                    <td className={classes.actionsCell}>
                      <div className={classes.actionsInner}>
                        {allow ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                const localDate = new Date(p.payment_date)
                                  .toLocaleDateString("sv-SE"); // YYYY-MM-DD
                                setEditingId(p.payment_id);
                                setEditForm({
                                  tenant_id: p.tenant_id,
                                  building_id: p.building_id,
                                  payment_date: localDate,
                                  category: p.category,
                                  description: p.description,
                                  amount: p.amount,
                                  status: p.status,
                                });
                              }}
                              className={`${classes.roundBtn} ${classes.editBtn}`}
                              title="ערוך"
                              aria-label="ערוך"
                            >
                              <span className={classes.emojiIcon}>✏️</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => onDelete(p.payment_id)}
                              className={`${classes.roundBtn} ${classes.deleteBtn}`}
                              title="מחק"
                              aria-label="מחק"
                            >
                              <span className={classes.emojiIcon}>🗑️</span>
                            </button>
                          </>
                        ) : (
                          // “גוסט” לשמירת פריסה
                          <>
                            <span className={`${classes.roundBtn} ${classes.ghost}`} aria-hidden="true" />
                            <span className={`${classes.roundBtn} ${classes.ghost}`} aria-hidden="true" />
                          </>
                        )}
                        {/* אם תרצה גם 🔔 רק לבעל התשלום, הוסף כאן תנאי allow */}
                        <span className={`${classes.roundBtn} ${classes.ghost}`} aria-hidden="true" />
                      </div>
                    </td>
                  </>
                )}
              </tr>
            );
          })
        )}
      </BaseTable>
    </div>
  );
}

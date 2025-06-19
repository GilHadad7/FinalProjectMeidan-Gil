import React, { useState } from "react";
import { FaEdit, FaTrash, FaSave, FaTimes, FaBell } from "react-icons/fa";
import classes from "./PaymentsTable.module.css";
import BaseTable from "../components/ui/BaseTable";

export default function PaymentsTable({ payments, onEdit, onDelete }) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  function handleChange(e) {
    const { name, value } = e.target;
    setEditForm((f) => ({ ...f, [name]: value }));
  }

  function handleSave(id) {
    const original = payments.find((p) => p.payment_id === id);

    const updated = {
      payment_id: id,
      tenant_id: editForm.tenant_id || original.tenant_id,
      building_id: editForm.building_id || original.building_id,
      payment_date: editForm.payment_date || original.payment_date,
      category: editForm.category || original.category || "",
      description: editForm.description || original.description || "",
      amount: Number(editForm.amount || original.amount),
      status: editForm.status || original.status,
    };

    onEdit(updated);
    setEditingId(null);
    setEditForm({});
  }

  function handleCancel() {
    setEditingId(null);
    setEditForm({});
  }

  function handleReminder(payment_id, tenant_id, tenant_name) {
    fetch("http://localhost:8801/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_id, tenant_id }),
    })
      .then(async (res) => {
        if (res.status === 201) {
          alert(`✅ נשלחה תזכורת לדייר ${tenant_name}`);
        } else if (res.status === 409) {
          const data = await res.json();
          const lastSent = new Date(data.last_sent).toLocaleString("he-IL");
          alert(`⚠️ כבר נשלחה תזכורת לדייר ${tenant_name} ב־24 השעות האחרונות.\nתזכורת אחרונה: ${lastSent}`);
        } else {
          alert("⚠️ שגיאה בשליחת תזכורת");
        }
      })
      .catch(() => {
        alert("❌ שגיאה בחיבור לשרת");
      });
  }

  return (
    <div className={classes.tableWrapper}>
      <BaseTable headers={["שם דייר", "שם בניין", "סכום", "תאריך", "תיאור", "סטטוס", "פעולות"]}>
        {payments.length === 0 ? (
          <tr>
            <td colSpan="7" style={{ textAlign: "center" }}>
              לא נמצאו תשלומים
            </td>
          </tr>
        ) : (
          payments.map((p) => (
            <tr key={p.payment_id}>
              {editingId === p.payment_id ? (
                <>
                  <td>{p.tenant_name}</td>
                  <td>{p.building_name}</td>
                  <td>
                    <input
                      name="amount"
                      type="number"
                      value={editForm.amount}
                      onChange={handleChange}
                    />
                  </td>
                  <td>
                    <input
                      name="payment_date"
                      type="date"
                      value={editForm.payment_date?.split("T")[0]}
                      onChange={handleChange}
                    />
                  </td>
                  <td>
                    <input
                      name="description"
                      value={editForm.description}
                      onChange={handleChange}
                    />
                  </td>
                  <td>
                    <select name="status" value={editForm.status} onChange={handleChange}>
                      <option value="שולם">שולם</option>
                      <option value="ממתין">ממתין</option>
                      <option value="חוב">חוב</option>
                    </select>
                  </td>
                  <td className={classes.actionsCell}>
                    <div className={classes.actionBtns}>
                      <button onClick={() => handleSave(p.payment_id)} className={classes.roundBtn}>
                        <FaSave />
                      </button>
                      <button onClick={handleCancel} className={classes.roundBtn}>
                        <FaTimes />
                      </button>
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td>{p.tenant_name}</td>
                  <td>{p.building_name}</td>
                  <td>{p.amount} ₪</td>
                  <td>{new Date(p.payment_date).toLocaleDateString("he-IL")}</td>
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
                  <td className={classes.actionsCell}>
                    <div className={classes.actionBtns}>
                      <button
                        onClick={() => {
                          setEditingId(p.payment_id);
                          setEditForm({
                            tenant_id: p.tenant_id,
                            building_id: p.building_id,
                            payment_date: p.payment_date,
                            category: p.category,
                            description: p.description,
                            amount: p.amount,
                            status: p.status,
                          });
                        }}
                        className={`${classes.roundBtn} ${classes.editBtn}`}
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => onDelete(p.payment_id)}
                        className={`${classes.roundBtn} ${classes.deleteBtn}`}
                      >
                        <FaTrash />
                      </button>
                      {["חוב", "ממתין"].includes(p.status) ? (
                        <button
                          onClick={() => handleReminder(p.payment_id, p.tenant_id, p.tenant_name)}
                          className={`${classes.roundBtn} ${classes.bellBtn}`}
                        >
                          <FaBell />
                        </button>
                      ) : (
                        <div
                          className={`${classes.roundBtn} ${classes.bellBtn}`}
                          style={{ visibility: "hidden" }}
                        ></div>
                      )}
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))
        )}
      </BaseTable>
    </div>
  );
}
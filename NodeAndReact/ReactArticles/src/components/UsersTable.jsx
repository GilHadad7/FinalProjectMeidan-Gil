import React from "react";
import classes from "./UsersTable.module.css";
import BaseTable from "./ui/BaseTable"; // ✅ שימוש בטבלה אחידה

export default function UsersTable({
  users,
  editId,
  setEditId,
  editForm,
  setEditForm,
  onDelete,
  onEditSave
}) {
  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  return (
    <BaseTable
      headers={[
        "שם",
        "תעודת זהות",
        "תפקיד",
        "טלפון",
        "מייל",
        "פעולות"
      ]}
    >
      {users.map(user =>
        editId === user.user_id ? (
          <tr key={user.user_id}>
            <td>
              <input
                className={classes.input}
                name="name"
                value={editForm.name || ""}
                onChange={handleEditChange}
              />
            </td>
            <td>
              <input
                className={classes.input}
                name="id_number"
                value={editForm.id_number || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^[0-9]*$/.test(value) && value.length <= 9) {
                    setEditForm({ ...editForm, id_number: value });
                  }
                }}
                inputMode="numeric"
              />
            </td>
            <td>
              <select
                className={classes.input}
                name="role"
                value={editForm.role || ""}
                onChange={handleEditChange}
              >
                <option value="manager">manager</option>
                <option value="worker">worker</option>
                <option value="tenant">tenant</option>
              </select>
            </td>
            <td>
              <input
                className={classes.input}
                name="phone"
                value={editForm.phone || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^[0-9]*$/.test(value) && value.length <= 10) {
                    setEditForm({ ...editForm, phone: value });
                  }
                }}
                inputMode="numeric"
              />
            </td>
            <td>
              <input
                className={classes.input}
                name="email"
                value={editForm.email || ""}
                onChange={handleEditChange}
              />
            </td>
            <td>
              <div className={classes.actions}>
                <button onClick={() => onEditSave(user.user_id)}>💾</button>
                <button onClick={() => setEditId(null)}>❌</button>
              </div>
            </td>
          </tr>
        ) : (
          <tr key={user.user_id}>
            <td>{user.name}</td>
            <td>{user.id_number}</td>
            <td>{user.role}</td>
            <td>{user.phone}</td>
            <td>{user.email}</td>
            <td>
              <div className={classes.actions}>
                <button
                  onClick={() => {
                    setEditId(user.user_id);
                    setEditForm({ ...user });
                  }}
                >✏️</button>
                <button onClick={() => onDelete(user.user_id)}>🗑️</button>
              </div>
            </td>
          </tr>
        )
      )}
    </BaseTable>
  );
}

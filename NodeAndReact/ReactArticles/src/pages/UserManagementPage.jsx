import React, { useState } from 'react';
import classes from './UserManagementPage.module.css';

const initialUsers = [
  { id: 1, name: 'יוסי כהן', role: 'דייר', phone: '050-1234567', email: 'yossi@example.com', buildings: ['נוף ים'] },
  { id: 2, name: 'רונית לוי', role: 'עובד', phone: '052-9876543', email: 'ronit@example.com', buildings: ['שער העיר', 'המרכזי'] },
  { id: 3, name: 'איתן חוזזולום', role: 'מנהל', phone: '053-2222222', email: 'ey@mgmt.com', buildings: ['כל הבניינים'] },
  { id: 4, name: 'דנה פרי', role: 'דייר', phone: '054-7894561', email: 'dana.f@example.com', buildings: ['מגדלי נוף ים'] },
  { id: 5, name: 'נועם שמואל', role: 'עובד', phone: '055-3332211', email: 'noam.shmuel@example.com', buildings: ['נופי הרכס, מגדלי תקווה'] },
  { id: 6, name: 'רועי בן דוד', role: 'מנהל', phone: '050-6667788', email: 'roi.bendavid@example.com', buildings: ['מגדלי הכרמל'] },
];

const buildingsList = ['נוף ים', 'שער העיר', 'המרכזי', 'מגדלי נוף ים', 'נופי הרכס', 'מגדלי תקווה', 'מגדלי הכרמל', 'כל הבניינים'];

export default function UserManagementPage() {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('הכל');
  const [newUser, setNewUser] = useState({ name: '', role: '', phone: '', email: '', buildings: [], id: '', password: '' });
  const [selectedBuildings, setSelectedBuildings] = useState([]);

  // --- עריכה ומחיקה ---
  const [editUserId, setEditUserId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', role: '', phone: '', email: '', buildings: '' });

  function handleEditClick(user) {
    setEditUserId(user.id);
    setEditForm({
      name: user.name || '',
      role: user.role || '',
      phone: user.phone || '',
      email: user.email || '',
      buildings: Array.isArray(user.buildings) ? user.buildings.join(', ') : (user.buildings || '')
    });
  }
  function handleEditChange(e) {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  }
  function handleEditSave(id) {
    setUsers(users => users.map(u =>
      u.id === id
        ? { ...u, ...editForm, buildings: editForm.buildings.split(',').map(s => s.trim()).filter(Boolean) }
        : u
    ));
    setEditUserId(null);
    setEditForm({ name: '', role: '', phone: '', email: '', buildings: '' });
  }
  function handleEditCancel() {
    setEditUserId(null);
    setEditForm({ name: '', role: '', phone: '', email: '', buildings: '' });
  }
  function handleDelete(id) {
    if (window.confirm('האם למחוק משתמש זה?')) {
      setUsers(users => users.filter(u => u.id !== id));
      if (editUserId === id) {
        setEditUserId(null);
        setEditForm({ name: '', role: '', phone: '', email: '', buildings: '' });
      }
    }
  }

  const filteredUsers = users.filter(user =>
    (filterRole === 'הכל' || user.role === filterRole) &&
    (search === '' || user.name.includes(search) || user.email.includes(search) || user.phone.includes(search))
  );

  function handleAddUser(e) {
    e.preventDefault();
    if (!newUser.name || !newUser.role || !newUser.phone || !newUser.email || selectedBuildings.length === 0) return;
    setUsers([
      ...users,
      {
        ...newUser,
        buildings: selectedBuildings,
        id: users.length ? Math.max(...users.map(u => u.id)) + 1 : 1,
      },
    ]);
    setNewUser({ name: '', role: '', phone: '', email: '', buildings: [], id: '', password: '' });
    setSelectedBuildings([]);
  }

  function handleBuildingSelect(e) {
    const value = e.target.value;
    setSelectedBuildings(value === 'בחר בניינים' ? [] : [value]);
  }

  return (
    <div className={classes.pageWrapper}>
      <div className={classes.leftPanel}>
        <h3 className={classes.addUserTitle}>הוסף משתמש:</h3>
        <form className={classes.addUserForm} onSubmit={handleAddUser}>
          <input
            className={classes.input}
            placeholder="שם מלא:"
            value={newUser.name}
            onChange={e => setNewUser({ ...newUser, name: e.target.value })}
          />
          <select
            className={classes.input}
            value={newUser.role}
            onChange={e => setNewUser({ ...newUser, role: e.target.value })}
          >
            <option value="">בחר תפקיד</option>
            <option value="מנהל">מנהל</option>
            <option value="עובד">עובד</option>
            <option value="דייר">דייר</option>
          </select>
          <input
            className={classes.input}
            placeholder="טלפון:"
            value={newUser.phone}
            onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
          />
          <input
            className={classes.input}
            placeholder="מייל:"
            value={newUser.email}
            onChange={e => setNewUser({ ...newUser, email: e.target.value })}
          />
          <select
            className={classes.input}
            value={selectedBuildings[0] || 'בחר בניינים'}
            onChange={handleBuildingSelect}
          >
            <option>בחר בניינים</option>
            {buildingsList.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <input
            className={classes.input}
            placeholder="סיסמה התחלתית:"
            value={newUser.password}
            onChange={e => setNewUser({ ...newUser, password: e.target.value })}
          />
          <button className={classes.addUserBtn} type="submit">הוסף משתמש</button>
        </form>
      </div>
      <div className={classes.rightPanel}>
        <div className={classes.headerRow}>
          <div className={classes.pageTitle}>User management</div>
          <div className={classes.searchBarRow}>
            <span className={classes.filterLabel}>חיפוש:</span>
            <input
              className={classes.searchInput}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="...חפש"
            />
          </div>
          <div className={classes.filterBarRow}>
            <span className={classes.filterLabel}>סינון:</span>
            <select
              className={classes.filterSelect}
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
            >
              <option value="הכל">הכל</option>
              <option value="דייר">דייר</option>
              <option value="מנהל">מנהל</option>
              <option value="עובד">עובד</option>
            </select>
          </div>
        </div>
        <table className={classes.usersTable}>
          <thead>
            <tr>
              <th>שם מלא</th>
              <th>תפקיד</th>
              <th>טלפון</th>
              <th>מייל</th>
              <th>בניינים שוחפצו</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => {
              const isEditing = editUserId === user.id;
              return (
                <tr key={user.id}>
                  {isEditing ? (
                    <>
                      <td><input className={classes.input} value={editForm.name} name="name" onChange={handleEditChange} /></td>
                      <td>
                        <select className={classes.input} value={editForm.role} name="role" onChange={handleEditChange}>
                          <option value="">בחר תפקיד</option>
                          <option value="מנהל">מנהל</option>
                          <option value="עובד">עובד</option>
                          <option value="דייר">דייר</option>
                        </select>
                      </td>
                      <td><input className={classes.input} value={editForm.phone} name="phone" onChange={handleEditChange} /></td>
                      <td><input className={classes.input} value={editForm.email} name="email" onChange={handleEditChange} /></td>
                      <td><input className={classes.input} value={editForm.buildings} name="buildings" onChange={handleEditChange} /></td>
                      <td className={classes.editActionsCell}>
                        <button className={classes.editActionBtn} onClick={() => handleEditSave(user.id)} title="שמור">💾</button>
                        <button className={classes.editActionBtn} onClick={handleEditCancel} title="ביטול">❌</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{user.name}</td>
                      <td>{user.role}</td>
                      <td>{user.phone}</td>
                      <td><a href={`mailto:${user.email}`}>{user.email}</a></td>
                      <td>{Array.isArray(user.buildings) ? user.buildings.join(', ') : user.buildings}</td>
                      <td>
                        <span className={classes.actionIcon} title="ערוך" onClick={() => handleEditClick(user)} style={{marginLeft: 6}}>✏️</span>
                        <span className={classes.actionIcon} title="מחק" onClick={() => handleDelete(user.id)}>🗑️</span>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

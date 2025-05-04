import React from "react";

function ServiceCallsTable({ role }) {
  const fakeData = [
    { id: 1, title: "Broken light", status: "Open", assignedTo: "David", building: "A" },
    { id: 2, title: "Water leak", status: "In Progress", assignedTo: "Roni", building: "B" },
  ];

  return (
    <div>
      <h2>Service Calls List</h2>
      
      <table border="1" cellPadding="8" cellSpacing="0" style={{ width: "100%", marginTop: "1rem" }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            {role === "admin" && <th>Building</th>}
            {role !== "tenant" && <th>Assigned To</th>}
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {fakeData.map((call) => (
            <tr key={call.id}>
              <td>{call.id}</td>
              <td>{call.title}</td>
              {role === "admin" && <td>{call.building}</td>}
              {role !== "tenant" && <td>{call.assignedTo}</td>}
              <td>{call.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ServiceCallsTable;

import React from "react";

function ServiceCallForm({ role }) {
  return (
    <form style={{ marginBottom: "2rem" }}>
      <h2>Open New Service Call</h2>

      {/* If not tenant - show building selector */}
      {role !== "tenant" && (
        <div style={{ marginBottom: "1rem" }}>
          <label>Choose building:</label>
          <select>
            <option>Building A</option>
            <option>Building B</option>
          </select>
        </div>
      )}

      <div style={{ marginBottom: "1rem" }}>
        <label>Issue:</label>
        <input type="text" placeholder="Short title of issue" />
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label>Description:</label>
        <textarea placeholder="Describe the issue..." />
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label>Upload image:</label>
        <input type="file" />
      </div>

      <button type="submit">Submit</button>
    </form>
  );
}

export default ServiceCallForm;

import React, { useState } from "react";

import ServiceCallForm from "../components/ServiceCallForm";
import ServiceCallsTable from "../components/ServiceCallsTable";

function ServiceCallsPage() {
  const user = JSON.parse(sessionStorage.getItem("user"));
  const role = user?.role;

  const [refreshFlag, setRefreshFlag] = useState(false);

  const triggerRefresh = () => {
    setRefreshFlag((prev) => !prev); // הפוך כל פעם
  };

  return (
    <div style={{ display: "flex", padding: "2rem", gap: "2rem", direction: "rtl" }}>
      
      {/* צד ימין – טופס */}
      <div style={{ flex: 0.7 }}>
        <h1>Service Calls</h1>
        <p style={{ fontStyle: "italic" }}>Role: {role}</p>
        <ServiceCallForm role={role} onSuccess={triggerRefresh} />
      </div>

      {/* צד שמאל – טבלה */}
      <div style={{ flex: 1.3 }} >
        <ServiceCallsTable role={role} refreshFlag={refreshFlag} setRefreshFlag={setRefreshFlag} />
      </div>

    </div>
  );
}

export default ServiceCallsPage;

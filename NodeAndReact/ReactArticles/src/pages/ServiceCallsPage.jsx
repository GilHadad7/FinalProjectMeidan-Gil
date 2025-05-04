import React from "react";
import ServiceCallForm from '../components/ServiceCallForm';
import ServiceCallsTable from "../components/ServiceCallsTable";

function ServiceCallsPage() {
  const user = JSON.parse(sessionStorage.getItem("user"));
  const role = user?.role
  ; // 'admin' / 'worker' / 'tenant'

  return (
    <div className="container" style={{ padding: "2rem" }}>
      <h1>Service Calls</h1>
      <p style={{ fontStyle: "italic" }}>Role: {role}</p>

      <ServiceCallForm role={role} />
      <hr style={{ margin: "2rem 0" }} />
      <ServiceCallsTable role={role} />
    </div>
  );
}

export default ServiceCallsPage;

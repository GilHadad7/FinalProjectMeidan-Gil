import { Navigate, useLocation } from "react-router-dom";

const rolePermissions = {
  manager: ["manager"],
  worker: ["worker"],
  tenant: ["tenant"],
};

const ProtectedRoute = ({ children }) => {
  const user = JSON.parse(sessionStorage.getItem("user"));
  const location = useLocation();



  if (!user) return <Navigate to="/" />;

  const path = location.pathname.split("/")[1]; // למשל 'admin'

  const allowed = rolePermissions[user.role]?.includes(path);
  return allowed ? children : <Navigate to={`/${user.role}`} />;

  //  return children
};

export default ProtectedRoute;

import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import BuildingsForm from "../components/BuildingsForm";
import BuildingsTable from "../components/BuildingsTable";
import classes from "./DetailsOfBuildingsPage.module.css";

export default function DetailsOfBuildingsPage() {
  const location = useLocation();
  const selectedBuildingId = location.state?.buildingId || null;

  const [buildings, setBuildings]     = useState([]);
  const [users, setUsers]             = useState([]);
  const [refreshFlag, setRefreshFlag] = useState(false);
  const [searchTerm, setSearchTerm]   = useState("");

  useEffect(() => {
    fetch("http://localhost:3000/api/buildings")
      .then((res) => res.json())
      .then((data) => {
        const list = selectedBuildingId
          ? data.filter((b) => b.building_id === selectedBuildingId)
          : data;
        setBuildings(list);
      })
      .catch(console.error);
  }, [refreshFlag, selectedBuildingId]);

  useEffect(() => {
    fetch("http://localhost:3000/api/users")
      .then((res) => res.json())
      .then((data) => setUsers(data))
      .catch(console.error);
  }, []);

  const enrichedBuildings = useMemo(() => {
    return buildings.map((b) => {
      const ids = b.assigned_workers
        ? b.assigned_workers.toString().split(",").map((x) => +x.trim())
        : [];
      const workersList = users.filter((u) => ids.includes(u.user_id));
      return { ...b, workersList };
    });
  }, [buildings, users]);

  const filteredBuildings = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return enrichedBuildings;

    return enrichedBuildings.filter((b) => {
      const matchName    = b.name?.toLowerCase().includes(term);
      const matchAddress = b.full_address?.toLowerCase().includes(term);

      const workersStr = b.workersList
        .map((w) => w.name)
        .join(" ");

      const matchWorkers = workersStr.toLowerCase().includes(term);

      return matchName || matchAddress || matchWorkers;
    });
  }, [searchTerm, enrichedBuildings]);

  const triggerRefresh = () => setRefreshFlag((p) => !p);

  return (
    <div className={classes.page}>
      <div className={classes.pageWrapper}>
        <div className={classes.leftPanel}>
          <BuildingsForm onSuccess={triggerRefresh} />
        </div>
        <div className={classes.rightPanel}>
          <h2 className={classes.pageTitle}>ניהול בניינים</h2>
          <div className={classes.searchWrapper}>
            <input
              type="text"
              placeholder="🔍 חפש לפי כתובת, שם בניין או שם עובד..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={classes.searchBox}
            />
          </div>
          <BuildingsTable
            buildings={filteredBuildings}
            onDelete={triggerRefresh}
          />
        </div>
      </div>
    </div>
  );
}

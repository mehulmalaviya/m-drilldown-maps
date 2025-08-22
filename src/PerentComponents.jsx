import React, { useState, useCallback } from "react";
import ChildComponents from "../src/ChildComponents";

const ParentComponents = () => {
  const [mapKey, setMapKey] = useState("world");

  // ✅ useCallback must have array dependencies
  const handleChangeMap = useCallback((key) => {
    setMapKey(key);
  }, []);

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <ChildComponents mapKey={mapKey} setMapKey={handleChangeMap} />
    </div>
  );
};

export default ParentComponents;

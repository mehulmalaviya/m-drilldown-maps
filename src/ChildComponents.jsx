import React, { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";

/**
 * Drilldown: World → India (states) → Gujarat (districts)
 */

const MAPS = {
  world: {
    title: "World Leads",
    url: [
      "https://cdn.jsdelivr.net/npm/echarts/map/json/world.json",
      "https://fastly.jsdelivr.net/npm/echarts/map/json/world.json",
    ],
    nameProperty: "name",
    data: [
      { name: "India", value: 210 },
      { name: "United States of America", value: 300 },
      { name: "Canada", value: 80 },
      { name: "Algeria", value: 90 },
    ],
    onClick: (params) => params.name,
  },
  India: {
    title: "India Leads (States/UTs)",
    url: [
      "https://gist.githubusercontent.com/jbrobst/56c13bbbf9d97d187fea01ca62ea5112/raw/e388c4cae20aa53cb5090210a42ebb9b765c0a36/india_states.geojson",
    ],
    nameProperty: "ST_NM",
    data: [
      { name: "Gujarat", value: 50 },
       { name: "Ladakh", value: 2 },
      { name: "Maharashtra", value: 7 },
      { name: "Delhi", value: 10 },
      { name: "Karnataka", value: 22 },
      { name: "Tamil Nadu", value: 35 },
    ],
    onClick: (params) => (params.name === "Gujarat" ? "gujarat" : null),
  },
  gujarat: {
    title: "Gujarat Leads (Districts)",
    url: [
      "https://cdn.jsdelivr.net/gh/udit-001/india-maps-data@bcbcba3/geojson/states/gujarat.geojson",
    ],
    nameProperty: "district",
    data: [
      { name: "Ahmadabad", value: 20 }, // geojson key is "Ahmadabad"
      { name: "Surat", value: 8 },
      { name: "Vadodara", value: 3 },
      { name: "Rajkot", value: 7},
      { name: "Bhavnagar", value: 2 },
      { name: "Jamnagar", value: 6 },
      { name: "Dahod", value: 100 },
    ],
    onClick: () => null,
  },
};

async function fetchJsonWithFallback(urls) {

  let lastErr;
  for (const url of urls) {
    try {
      const r = await fetch(url, { cache: "no-store" });
      console.log("r", r);

      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (err) {
      console.log("err", err);

      lastErr = err;
    }
  }
  throw lastErr || new Error("Failed to fetch GeoJSON");
}

export default function DrilldownMap() {
  const elRef = useRef(null);
  const chartRef = useRef(null);

  const [stack, setStack] = useState(["world"]);//india
  const [loading, setLoading] = useState(false);
  const currentKey = stack[stack.length - 1];

  const renderMap = async (key) => {
    const cfg = MAPS[key];
    if (!cfg) return;

    setLoading(true);
    try {
      const geo = await fetchJsonWithFallback(cfg.url);
      echarts.registerMap(key, geo);

      const values = (cfg.data || []).map((d) => d.value);
      const min = Math.min(0, ...values);
      const max = Math.max(1, ...values);

      chartRef.current.setOption(
        {
          backgroundColor: "#0000",
          title: { text: cfg.title, left: "center" },
          tooltip: {
            trigger: "item",
            formatter: (p) => `${p.name}: ${p.value ?? 0}`,
          },
          visualMap: {
            min,
            max,
            left: 10,
            bottom: 10,
            text: ["High", "Low"],
            calculable: true,
            // inRange: { color: ["#e0ffff", "#006edd"] },
            inRange: { color: ["#e0ffe0", "#008000"] },
          },
          series: [
            {
              name: cfg.title,
              type: "map",
              map: key,
              roam: true,
              nameProperty: cfg.nameProperty,
              label: {
                show: true,
                color: "#5b6161",
                fontSize: 9,
              },
              emphasis: {
                label: { show: true, color: "#ffff" },
                itemStyle: {
                  areaColor: "#2ecc71", // green highlight
                  shadowColor: "#ffff",
                  shadowBlur: 12,
                  borderColor: "#333",
                  borderWidth: 1,
                },
              },
              data: cfg.data || [],
              itemStyle: {
                borderColor: "#ffff",
                borderWidth: 1,
                shadowColor: "#ffff",
                shadowBlur: 12,
                shadowOffsetX: 2,
                shadowOffsetY: 2,
                areaColor: "#e6e6e6",  // ✅ fallback gray for states with no data
              },
            },
          ],
          visualMap: {
            min,
            max,
            left: 10,
            bottom: 10,
            text: ["High", "Low"],
            calculable: true,
            inRange: {
              color: ["#b6f0b2", "#2ecc71"], // ✅ gradient green for states with data
            },
            outOfRange: {
              color: ["#e6e6e6"],  // ✅ gray for states without data
            },
          },

        },
        true
      );

      chartRef.current.off("click");
      chartRef.current.on("click", (params) => {
        const next = cfg.onClick ? cfg.onClick(params) : null;
        if (next && MAPS[next]) {
          setStack((s) => {
            const updated = [...s, next];
            queueMicrotask(() => renderMap(next));
            return updated;
          });
        }
      });
    } catch (e) {
      console.error("Map load error:", e);
      chartRef.current.setOption({
        title: { text: `${cfg.title} (failed to load map)`, left: "center" },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chartRef.current = echarts.init(elRef.current);
    renderMap("world"); //India

    const onResize = () => chartRef.current && chartRef.current.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chartRef.current && chartRef.current.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goBack = () => {
    if (stack.length <= 1) return;
    const nextStack = stack.slice(0, -1);
    setStack(nextStack);
    renderMap(nextStack[nextStack.length - 1]);
  };

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 8,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={goBack}
          disabled={stack.length <= 1 || loading}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid #ccc",
            background: stack.length <= 1 ? "#eee" : "#f5f5f5",
            color:'black',
            cursor: stack.length <= 1 ? "not-allowed" : "pointer",
          }}
        >
          ← Back
        </button>

        <div style={{ fontWeight: 600 }}>
          {stack.join(" / ").replace(/(^\w)/, (m) => m.toUpperCase())}
        </div>

        {loading && (
          <div
            style={{
              fontSize: 12,
              padding: "4px 8px",
              border: "1px solid #ddd",
              borderRadius: 6,
              background: "#fff",
            }}
          >
            Loading map…
          </div>
        )}
      </div>

      <div
        ref={elRef}
        style={{
          background: "#ffff",
          width: 1200,
          height: 600,
          border: "1px solid #ddd",
          borderRadius: 8,
        }}
      />

      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
            background: "rgba(255,255,255,0.35)",
            borderRadius: 8,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              border: "4px solid #bbb",
              borderTopColor: "transparent",
              animation: "spin 0.9s linear infinite",
            }}
          />
          <style>
            {`
              @keyframes spin {
                from { transform: rotate(0deg) }
                to { transform: rotate(360deg) }
              }
            `}
          </style>
        </div>
      )}
    </div>
  );
}
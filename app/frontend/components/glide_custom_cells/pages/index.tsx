import dynamic from "next/dynamic";
import React from "react";

const Grid = dynamic(() => import("../components/Grid"), { ssr: false });

export default function Home() {
  return (
    <div style={{ padding: "20px", height: "100vh" }}>
      <Grid />
    </div>
  );
} 
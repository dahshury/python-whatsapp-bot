import dynamic from "next/dynamic";

const Grid = dynamic(() => import("../components/Grid"), { ssr: false });

export default function Home() {
	return (
		<div style={{ padding: "20px", height: "100vh" }}>
			<Grid />
		</div>
	);
}

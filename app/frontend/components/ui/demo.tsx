import { HeroPill, StarIcon } from "@/components/ui/hero-pill";

function HeroPillDemo() {
	return (
		<div className="space-y-4">
			<HeroPill icon={<StarIcon />} text="New releases every week" />

			<HeroPill
				icon={
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="12"
						height="12"
						viewBox="0 0 24 24"
						className="fill-zinc-500"
					>
						<title>Triangle icon</title>
						<path d="M12 2L1 21h22L12 2z" />
					</svg>
				}
				text="Custom Icon Pill"
			/>
		</div>
	);
}

export { HeroPillDemo };

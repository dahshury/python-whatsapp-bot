import type { SpriteMap } from "@glideapps/glide-data-grid";

export const headerIcons: SpriteMap = {
	"icon-scheduled": (p) =>
		`<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
					<rect x="2" y="2" width="16" height="16" rx="4" fill="${p.bgColor}"/>
					<path d="M6 5.5v2" stroke="${p.fgColor}" stroke-width="1.5" stroke-linecap="round"/>
					<path d="M14 5.5v2" stroke="${p.fgColor}" stroke-width="1.5" stroke-linecap="round"/>
					<rect x="4.75" y="6.75" width="10.5" height="8.5" rx="2" stroke="${p.fgColor}" stroke-width="1.5"/>
					<path d="M10 10v-2" stroke="${p.fgColor}" stroke-width="1.5" stroke-linecap="round"/>
					<path d="M10 10l2 2" stroke="${p.fgColor}" stroke-width="1.5" stroke-linecap="round"/>
				</svg>`,
	"icon-phone": (p) =>
		`<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
					<rect x="2" y="2" width="16" height="16" rx="4" fill="${p.bgColor}"/>
					<path d="M7.5 5.5h5a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z" stroke="${p.fgColor}" stroke-width="1.5"/>
					<circle cx="10" cy="13.5" r="0.75" fill="${p.fgColor}"/>
				</svg>`,
	"icon-name": (p) =>
		`<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
					<rect x="2" y="2" width="16" height="16" rx="4" fill="${p.bgColor}"/>
					<circle cx="10" cy="8" r="2.25" stroke="${p.fgColor}" stroke-width="1.5"/>
					<path d="M5.5 14.5c1.3-1.8 3-2.75 4.5-2.75s3.2.95 4.5 2.75" stroke="${p.fgColor}" stroke-width="1.5" stroke-linecap="round"/>
				</svg>`,
};

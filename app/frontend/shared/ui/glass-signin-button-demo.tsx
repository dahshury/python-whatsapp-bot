"use client";

import { GlassSignInButton } from "./glass-components";

function noop(): void {
	/* intentionally empty */
}

/**
 * Demo: GlassSignInButton
 *
 * Shows the premium glass-morphism button component from the T0 design system.
 * This component recreates the exact styling and behavior from the external website.
 */
export function GlassSignInButtonDemo() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-t0-background p-4">
			{/* Container with T0 theme background */}
			<div className="space-y-4 text-center">
				<h1 className="font-bold text-4xl text-t0-on-surface">
					T0 Glass Sign In Button
				</h1>
				<p className="text-lg text-t0-on-surface-dark">
					Premium glass-morphism design with gradient surfaces
				</p>
			</div>

			{/* Button examples */}
			<div className="flex flex-col items-center gap-6">
				{/* Default button */}
				<div className="flex flex-col items-center gap-2">
					<p className="text-sm text-t0-on-surface-darker">Default</p>
					<GlassSignInButton onClick={noop} />
				</div>

				{/* With custom text */}
				<div className="flex flex-col items-center gap-2">
					<p className="text-sm text-t0-on-surface-darker">Custom Text</p>
					<GlassSignInButton onClick={noop}>Create Account</GlassSignInButton>
				</div>

				{/* Disabled state */}
				<div className="flex flex-col items-center gap-2">
					<p className="text-sm text-t0-on-surface-darker">Disabled</p>
					<GlassSignInButton disabled>Sign In (Disabled)</GlassSignInButton>
				</div>
			</div>

			{/* Feature description */}
			<div className="max-w-md space-y-2 text-sm text-t0-on-surface-dark">
				<h3 className="font-semibold text-t0-on-surface">Features:</h3>
				<ul className="list-inside list-disc space-y-1">
					<li>Gradient border effects (surface-edge to surface)</li>
					<li>Inner highlight layer (surface-highlight to surface)</li>
					<li>Active state animations (scale and opacity)</li>
					<li>Two-level surface system for depth</li>
					<li>Full keyboard and accessibility support</li>
				</ul>
			</div>
		</div>
	);
}

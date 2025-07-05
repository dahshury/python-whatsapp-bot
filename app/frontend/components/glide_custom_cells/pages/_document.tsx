import Document, {
	type DocumentContext,
	Head,
	Html,
	Main,
	NextScript,
} from "next/document";
import { Z_INDEX } from "@/lib/z-index";

export default class MyDocument extends Document {
	static async getInitialProps(ctx: DocumentContext) {
		const initialProps = await Document.getInitialProps(ctx);
		return { ...initialProps };
	}

	render() {
		return (
			<Html>
				<Head />
				<body>
					<Main />
					<NextScript />
					<div
						id="portal"
						style={{
							position: "fixed",
							left: 0,
							top: 0,
							zIndex: Z_INDEX.MODAL_BACKDROP,
						}}
					/>
				</body>
			</Html>
		);
	}
}

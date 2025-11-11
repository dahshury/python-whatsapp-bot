import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  isSupportedThemeName,
  type ThemeName,
} from "@/shared/constants/theme-names";

const CACHE_CONTROL_HEADER = "public, max-age=0, must-revalidate";
const CSS_EXTENSION = ".css";

type RouteContext = {
  params: Promise<{
    theme: string;
  }>;
};

const THEME_DIRECTORIES = [
  path.join(process.cwd(), "styles", "themes"),
  path.join(process.cwd(), "app", "frontend", "styles", "themes"),
];

const resolveThemeFilePath = (themeName: ThemeName): string | null => {
  for (const directory of THEME_DIRECTORIES) {
    const candidate = path.join(directory, `${themeName}${CSS_EXTENSION}`);
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
};

const normalizeThemeParam = (rawTheme: string): ThemeName | null => {
  if (!rawTheme) {
    return null;
  }
  const themeName = rawTheme.endsWith(CSS_EXTENSION)
    ? (rawTheme.slice(0, -CSS_EXTENSION.length) as string)
    : rawTheme;

  if (!isSupportedThemeName(themeName)) {
    return null;
  }

  return themeName;
};

const createStylesheetResponse = ({
  themeName,
  cssContent,
  etag,
  status = 200,
}: {
  themeName: ThemeName;
  cssContent: string | null;
  etag: string;
  status?: number;
}) => {
  const response =
    cssContent === null
      ? new NextResponse(null, { status })
      : new NextResponse(cssContent, { status });

  response.headers.set("Content-Type", "text/css; charset=utf-8");
  response.headers.set("Cache-Control", CACHE_CONTROL_HEADER);
  response.headers.set("ETag", etag);
  response.headers.set("X-Theme-Name", themeName);
  return response;
};

const readThemeStylesheet = async (
  themeName: ThemeName
): Promise<string | null> => {
  const filePath = resolveThemeFilePath(themeName);
  if (!filePath) {
    return null;
  }

  try {
    return await readFile(filePath, "utf8");
  } catch (_error) {
    return null;
  }
};

export async function GET(request: Request, context: RouteContext) {
  const params = await context.params;
  const themeName = normalizeThemeParam(params.theme);
  if (!themeName) {
    return new NextResponse("Theme stylesheet not found.", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": CACHE_CONTROL_HEADER,
      },
    });
  }

  const cssContent = await readThemeStylesheet(themeName);
  if (cssContent === null) {
    return new NextResponse("Theme stylesheet not found.", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": CACHE_CONTROL_HEADER,
      },
    });
  }

  const etagValue = `"${createHash("sha1").update(cssContent).digest("hex")}"`;
  const requestETag = request.headers.get("if-none-match");

  if (requestETag && requestETag === etagValue) {
    return createStylesheetResponse({
      themeName,
      cssContent: null,
      etag: etagValue,
      status: 304,
    });
  }

  return createStylesheetResponse({
    themeName,
    cssContent,
    etag: etagValue,
  });
}

export async function HEAD(request: Request, context: RouteContext) {
  const params = await context.params;
  const themeName = normalizeThemeParam(params.theme);
  if (!themeName) {
    return new NextResponse(null, { status: 404 });
  }

  const cssContent = await readThemeStylesheet(themeName);
  if (cssContent === null) {
    return new NextResponse(null, { status: 404 });
  }

  const etagValue = `"${createHash("sha1").update(cssContent).digest("hex")}"`;
  const requestETag = request.headers.get("if-none-match");

  if (requestETag && requestETag === etagValue) {
    return createStylesheetResponse({
      themeName,
      cssContent: null,
      etag: etagValue,
      status: 304,
    });
  }

  return createStylesheetResponse({
    themeName,
    cssContent: null,
    etag: etagValue,
  });
}

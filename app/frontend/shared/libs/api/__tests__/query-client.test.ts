import { QueryClient } from "@tanstack/react-query";
import { expect, test } from "vitest";
import { queryClient } from "@/shared/api";

test("queryClient is a QueryClient with sane defaults", () => {
  expect(queryClient).toBeInstanceOf(QueryClient);
  const opts = queryClient.getDefaultOptions();
  expect(opts.queries?.staleTime).toBeGreaterThan(0);
  expect(opts.queries?.gcTime).toBeGreaterThan(0);
});

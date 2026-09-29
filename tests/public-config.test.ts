import { afterEach, describe, expect, it } from "vitest";

import { publicConfig } from "../app/lib/config.server";
import { PUBLIC_CONFIG_META, readPublicConfig } from "../app/lib/public-config";

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
});

describe("public (browser) configuration", () => {
  it("exposes the browser DSN, release and environment only", () => {
    Object.assign(process.env, {
      PUBLIC_SENTRY_DSN: "http://public@ingest:9000/1",
      SENTRY_DSN: "http://server-only@ingest:9000/1",
      APP_RELEASE: "0123abc",
      APP_ENV: "preview",
      APP_SECRET: "not-for-the-browser",
      V0_SECRET_CANARY: "AGENTSAPP-CANARY-test",
      DATABASE_URL: "postgres://db:5432/private-db-name",
    });
    const config = publicConfig();
    expect(config).toEqual({
      sentryDsn: "http://public@ingest:9000/1",
      release: "0123abc",
      environment: "preview",
    });
    const serialized = JSON.stringify(config);
    for (const secret of [
      "AGENTSAPP-CANARY-test",
      "server-secret-value",
      "db-password",
      "server-only",
    ]) {
      expect(serialized).not.toContain(secret);
    }
  });

  it("works with empty DSNs", () => {
    delete process.env.PUBLIC_SENTRY_DSN;
    expect(publicConfig().sentryDsn).toBe("");
  });

  it("is read back in the browser from the meta tags rendered by the root layout", () => {
    const values: Record<string, string> = {
      [PUBLIC_CONFIG_META.sentryDsn]: "http://public@ingest:9000/1",
      [PUBLIC_CONFIG_META.release]: "0123abc",
      [PUBLIC_CONFIG_META.environment]: "preview",
    };
    const doc = {
      querySelector: (selector: string) => {
        const name = /meta\[name="([^"]+)"\]/.exec(selector)?.[1] ?? "";
        return name in values ? { content: values[name] } : null;
      },
    } as unknown as Document;
    expect(readPublicConfig(doc)).toEqual({
      sentryDsn: "http://public@ingest:9000/1",
      release: "0123abc",
      environment: "preview",
    });
  });
});

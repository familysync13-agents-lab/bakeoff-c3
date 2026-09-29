/** Browser-safe configuration, rendered into <meta> tags by the root layout. */
export type PublicConfig = {
  sentryDsn: string;
  release: string;
  environment: string;
};

export const PUBLIC_CONFIG_META = {
  sentryDsn: "sentry-dsn",
  release: "app-release",
  environment: "app-environment",
} as const satisfies Record<keyof PublicConfig, string>;

export function readPublicConfig(doc: Document): PublicConfig {
  const read = (name: string) =>
    doc.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content ?? "";
  return {
    sentryDsn: read(PUBLIC_CONFIG_META.sentryDsn),
    release: read(PUBLIC_CONFIG_META.release),
    environment: read(PUBLIC_CONFIG_META.environment),
  };
}

import type { PluginTheme } from "@getpaseo/plugin";
import { type PluginSurfaceProps, usePaseo, useRpc } from "@getpaseo/plugin/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { GetDevSpaceStatusRpc, StartDevSpaceRpc, StopDevSpaceRpc } from "../shared/contracts";
import { openExternalHttpUrl } from "./external-url";
import { projectsFromWorkspaces } from "./projects";

declare global {
  interface Window {
    readonly paseoDesktop?: { readonly opener?: { readonly openUrl?: (url: string) => Promise<void> } };
  }
}

export function DevSpaceManagerSurface({ theme, layout }: PluginSurfaceProps) {
  const paseo = usePaseo();
  const styles = useStyles(theme, layout.compact);
  const projects = useQuery({
    queryKey: ["devspace-manager", "projects"],
    queryFn: async () => {
      const page = await paseo.workspaces.list({ page: { limit: 200 } });
      return projectsFromWorkspaces(page.entries);
    },
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heading}>
        <View style={styles.grow}>
          <Text style={styles.title}>DevSpace</Text>
          <Text style={styles.muted}>Inicie, pare, abra serviços e acompanhe logs por projeto.</Text>
        </View>
        {projects.isFetching ? <ActivityIndicator color={theme.colors.foregroundMuted} /> : null}
      </View>
      {projects.error ? <Text accessibilityRole="alert" style={styles.error}>{errorMessage(projects.error)}</Text> : null}
      {projects.data?.map((project) => (
        <ProjectCard key={project.id} name={project.name} directory={project.directory} platform={layout.platform} theme={theme} styles={styles} />
      ))}
      {projects.data?.length === 0 ? <Text style={styles.empty}>Nenhum projeto ativo disponível neste host.</Text> : null}
    </ScrollView>
  );
}

function ProjectCard({ name, directory, platform, theme, styles }: {
  readonly name: string;
  readonly directory: string;
  readonly platform: PluginSurfaceProps["layout"]["platform"];
  readonly theme: PluginTheme;
  readonly styles: Styles;
}) {
  const status = useRpc(GetDevSpaceStatusRpc);
  const start = useRpc(StartDevSpaceRpc);
  const stop = useRpc(StopDevSpaceRpc);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const queryClient = useQueryClient();
  const queryKey = ["devspace-manager", "project", directory] as const;
  const query = useQuery({
    queryKey,
    queryFn: () => status({ directory }),
    refetchInterval: (current) => current.state.data?.state === "stopped" ? 5_000 : 1_000,
  });
  const refresh = async () => queryClient.invalidateQueries({ queryKey });
  const startMutation = useMutation({ mutationFn: () => start({ directory }), onSuccess: refresh });
  const stopMutation = useMutation({ mutationFn: () => stop({ directory }), onSuccess: refresh });
  const data = query.data;
  const transitioning = data?.state === "starting" || data?.state === "stopping";
  const busy = transitioning || startMutation.isPending || stopMutation.isPending;

  async function openInBrowser(url: string): Promise<void> {
    setLinkError(null);
    try {
      const desktopOpen = typeof window !== "undefined" && typeof window.paseoDesktop?.opener?.openUrl === "function"
        ? window.paseoDesktop.opener.openUrl
        : undefined;
      await openExternalHttpUrl(url, {
        platform,
        ...(desktopOpen === undefined ? {} : { desktopOpen }),
        browserOpen: (value) => {
          if (typeof window !== "undefined") window.open(value, "_blank", "noopener,noreferrer");
        },
        nativeOpen: Linking.openURL,
      });
    } catch (error) {
      setLinkError(errorMessage(error));
    }
  }

  return (
    <View style={[styles.card, !data?.detected && styles.cardMuted]} accessibilityLiveRegion="polite">
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: stateColor(data?.state, theme) }]} />
        <View style={styles.grow}>
          <Text style={styles.cardTitle}>{name}</Text>
          <Text numberOfLines={2} style={styles.path}>{directory}</Text>
        </View>
        {query.isFetching ? <ActivityIndicator size="small" color={theme.colors.foregroundMuted} /> : null}
      </View>
      <Text style={styles.status}>{data?.detected ? `${stateLabel(data.state)} · ${data.configFile}` : "Sem devspace.yaml"}</Text>
      {data?.message ? <Text style={data.state === "failed" ? styles.error : styles.muted}>{data.message}</Text> : null}
      {query.error ? <Text accessibilityRole="alert" style={styles.error}>{errorMessage(query.error)}</Text> : null}
      {linkError ? <Text accessibilityRole="alert" style={styles.error}>{linkError}</Text> : null}
      {data?.detected ? (
        <View style={styles.actions}>
          <Button label={startMutation.isPending ? "Iniciando..." : "Play"} disabled={busy || data.state === "running"} primary onPress={() => startMutation.mutate()} styles={styles} />
          {(data.state === "running" || data.state === "starting" || data.state === "stopping") ? (
            <Button label={stopMutation.isPending || data.state === "stopping" ? "Parando..." : "Parar"} disabled={stopMutation.isPending || data.state === "stopping"} onPress={() => stopMutation.mutate()} styles={styles} />
          ) : null}
          <Button label={logsOpen ? "Ocultar logs" : "Ver logs"} disabled={false} onPress={() => setLogsOpen((open) => !open)} styles={styles} />
        </View>
      ) : null}
      {logsOpen && data?.detected ? (
        <View style={styles.logs} accessibilityLabel={`Logs dos containers de ${name}`}>
          <Text style={styles.logsTitle}>Logs dos containers</Text>
          {data.logs.length > 0 ? data.logs.map((line, index) => (
            <Text key={`${index}-${line}`} selectable style={styles.logLine}>{line}</Text>
          )) : <Text style={styles.muted}>Aguardando saída dos containers...</Text>}
        </View>
      ) : null}
      {data?.links.map((url) => (
        <Pressable key={url} accessibilityRole="link" accessibilityLabel={`Abrir ${url} no navegador`} onPress={() => void openInBrowser(url)} style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
          <Text numberOfLines={1} style={styles.linkText}>{url}</Text>
          <Text style={styles.open}>Abrir</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Button({ label, disabled, primary = false, onPress, styles }: {
  readonly label: string;
  readonly disabled: boolean;
  readonly primary?: boolean;
  readonly onPress: () => void;
  readonly styles: Styles;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, primary && styles.primaryButton, (pressed || disabled) && styles.pressed]}><Text style={[styles.buttonText, primary && styles.primaryButtonText]}>{label}</Text></Pressable>;
}

function stateLabel(state: "stopped" | "starting" | "running" | "stopping" | "failed"): string {
  switch (state) {
    case "stopped": return "Parado";
    case "starting": return "Iniciando";
    case "running": return "Rodando";
    case "stopping": return "Parando";
    case "failed": return "Falhou";
  }
}

function stateColor(state: "stopped" | "starting" | "running" | "stopping" | "failed" | undefined, theme: PluginTheme): string {
  if (state === "running") return theme.colors.statusSuccess;
  if (state === "starting" || state === "stopping") return theme.colors.statusWarning;
  if (state === "failed") return theme.colors.statusDanger;
  return theme.colors.foregroundMuted;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Falha ao carregar DevSpace.";
}

function useStyles(theme: PluginTheme, compact: boolean) {
  return useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.surface0 },
    content: { padding: compact ? 16 : 24, gap: 12 },
    heading: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
    grow: { flex: 1, gap: 3 },
    title: { color: theme.colors.foreground, fontSize: compact ? 20 : 24, fontWeight: "700" },
    muted: { color: theme.colors.foregroundMuted, fontSize: 13, lineHeight: 19 },
    error: { color: theme.colors.statusDanger, fontSize: 13, lineHeight: 19 },
    empty: { color: theme.colors.foregroundMuted, textAlign: "center", paddingVertical: 24 },
    card: { backgroundColor: theme.colors.surface1, borderColor: theme.colors.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: compact ? 14 : 16, gap: 10 },
    cardMuted: { opacity: 0.72 },
    row: { flexDirection: "row", alignItems: "center", gap: 10 },
    dot: { width: 9, height: 9, borderRadius: 5 },
    cardTitle: { color: theme.colors.foreground, fontSize: 15, fontWeight: "600" },
    path: { color: theme.colors.foregroundMuted, fontFamily: "monospace", fontSize: 12 },
    status: { color: theme.colors.foreground, fontSize: 13, fontWeight: "500" },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    button: { minHeight: 44, justifyContent: "center", alignItems: "center", borderRadius: 9, paddingHorizontal: 14, backgroundColor: theme.colors.surface2 },
    primaryButton: { backgroundColor: theme.colors.accent },
    buttonText: { color: theme.colors.foreground, fontSize: 13, fontWeight: "600" },
    primaryButtonText: { color: theme.colors.accentForeground },
    logs: { backgroundColor: theme.colors.surface0, borderColor: theme.colors.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: 9, padding: 12, gap: 4 },
    logsTitle: { color: theme.colors.foreground, fontSize: 13, fontWeight: "600", marginBottom: 4 },
    logLine: { color: theme.colors.foregroundMuted, fontFamily: "monospace", fontSize: 12, lineHeight: 18 },
    link: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, borderRadius: 9, backgroundColor: theme.colors.surface2 },
    linkText: { flex: 1, color: theme.colors.foreground, fontFamily: "monospace", fontSize: 12 },
    open: { color: theme.colors.accent, fontSize: 13, fontWeight: "600" },
    pressed: { opacity: 0.55 },
  }), [theme, compact]);
}

type Styles = ReturnType<typeof useStyles>;

# devspace-manager

Plugin do [Paseo](https://paseo.sh) para iniciar, parar e acompanhar sessões [DevSpace](https://devspace.sh) por projeto.

- Tela **DevSpace** na sidebar lista os projetos dos workspaces do host.
- Para projetos com `devspace.yaml`/`devspace.yml`: **Play** (`devspace dev`), **Parar**, logs dos containers ao vivo.
- Descobre URLs (port forwards e sites Caddy) e abre no navegador.

## Instalação

```bash
npm install
npm run typecheck
paseo plugin install /caminho/para/paseo-devspace
```

Requer o `devspace` no PATH do daemon e plugins habilitados (Settings → Plugins).

## Desenvolvimento

```bash
bun test
paseo plugin reload devspace-manager
```

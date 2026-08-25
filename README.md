# system-design-playbook

## Excalidraw image exports

Every `.excalidraw` source file under `HLD` is exported to an SVG with the same relative path under `HLD/images`.

One-time setup after cloning:

```powershell
npm install
npm run setup:browser
npm run setup:hooks
```

Run the export manually with:

```powershell
npm run export:diagrams
```

The configured Git `pre-commit` hook runs the export and stages the generated SVG files automatically, so source diagrams and their images are committed together.
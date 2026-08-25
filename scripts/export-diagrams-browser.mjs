import { exportToSvg } from "@excalidraw/excalidraw";

window.exportDiagrams = async (files) => {
  for (const { source, output } of files) {
    const scene = JSON.parse(await (await fetch(`/${source}`)).text());
    const svg = await exportToSvg({
      elements: scene.elements,
      appState: {
        exportBackground: true,
        exportWithDarkMode: false,
        viewBackgroundColor: "#ffffff",
      },
      files: scene.files,
      exportPadding: 20,
    });
    await fetch("/api/write-svg", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ output, content: svg.outerHTML }),
    });
  }
};
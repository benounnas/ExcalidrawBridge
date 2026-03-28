import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useExcalidrawBridge } from "./hooks/useExcalidrawBridge";

function App() {
  const { onApiReady } = useExcalidrawBridge();

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Excalidraw excalidrawAPI={onApiReady} />
    </div>
  );
}

export default App;

import { PropsWithChildren } from "react";
import { PlatformAdapter } from "./platform/index";
import "./app.scss";

function App({ children }: PropsWithChildren<Record<string, unknown>>) {
  PlatformAdapter.init();
  return children;
}

export default App;
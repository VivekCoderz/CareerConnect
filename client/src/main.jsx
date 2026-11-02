// Error monitoring first, so errors while the app starts are reported too (I08).
import "./monitoring/sentry";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { initAnalytics } from "./monitoring/analytics";

import { Provider } from "react-redux";
import { store } from "./redux/store";

initAnalytics();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);
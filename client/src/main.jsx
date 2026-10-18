// Error monitoring first, so errors while the app starts are reported too (I08).
import "./monitoring/sentry";
import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { initAnalytics } from "./monitoring/analytics";
import { isCampusHost } from "./campus/host";
import CampusApp from "./campus/lazyApp";

import { Provider } from "react-redux";
import { store } from "./redux/store";

// A university portal host (docs/campus) gets the campus app, loaded as its own bundle.
// Known E2Job hosts are decided without a network call, so E2Job users pay nothing extra.
const root = ReactDOM.createRoot(document.getElementById("root"));

if (isCampusHost()) {
  root.render(
    <React.StrictMode>
      <Suspense fallback={null}>
        <CampusApp />
      </Suspense>
    </React.StrictMode>
  );
} else {
  initAnalytics();
  root.render(
    <React.StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
    </React.StrictMode>
  );
}
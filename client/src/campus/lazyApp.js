import { lazy } from "react";

// The only campus file the main entry imports: the campus app as its own lazily loaded bundle.
export default lazy(() => import("./CampusApp"));

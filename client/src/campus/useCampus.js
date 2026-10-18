import { createContext, useContext } from "react";

// The campus portal state (institution and signed-in person); provided by context.jsx.
export const CampusContext = createContext(null);

export const useCampus = () => useContext(CampusContext);

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../utils/api";
import { useAuth } from "./AuthContext";

const RoutineContext = createContext({ days: [], loading: false, error: "" });

export function RoutineProvider({ children }) {
    const [days, setDays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("current");
    const { user } = useAuth();

    const fetchRoutine = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const { data } = await api.get("/routine");
            setDays(data.days || []);
            setStatus(data.status || "current");
        } catch (err) {
            setError(err.response?.data?.error || "Failed to load routine");
            setDays([]);
            setStatus("current");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchRoutine();
        } else {
            setDays([]);
            setStatus("current");
            setLoading(false);
        }
    }, [user, fetchRoutine]);

    return (
        <RoutineContext.Provider value={{ days, status, loading, error, refreshRoutine: fetchRoutine }}>
            {children}
        </RoutineContext.Provider>
    );
}

export const useRoutine = () => useContext(RoutineContext);

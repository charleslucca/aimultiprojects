// This component redirects to the new OnePageView
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to OnePageView which is the new executive dashboard
    navigate("/", { replace: true });
  }, [navigate]);

  return null;
}
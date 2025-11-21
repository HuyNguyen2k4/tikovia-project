import { useEffect } from "react";

import { useDispatch, useSelector } from "react-redux";

import "./App.css";
import ScrollToTop from "./components/common/ScrollToTop";
import useUserStatusSocket from "./components/socket/UseUserStatusSocket";
import AppRoutes from "./routes/AppRoutes";
import { fetchCurrentUser } from "./store/authSlice";
import ChatWidget from "./components/n8nChat/ChatWidget";

export default function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, hasFetchedProfile } = useSelector((state) => state.auth);

  useEffect(() => {
    // Chỉ gọi `fetchCurrentUser` nếu người dùng đã đăng nhập và chưa fetch profile
    if (isAuthenticated && !hasFetchedProfile) {
      dispatch(fetchCurrentUser());
    }
  }, [dispatch, isAuthenticated, hasFetchedProfile]); // Thêm các dependency cần thiết
  useUserStatusSocket();
  return (
    <>
      <ScrollToTop />
      <AppRoutes />
      <ChatWidget webhookUrl={import.meta.env.VITE_N8N_WEBHOOK_URL} isAuthenticated={isAuthenticated} />
    </>
  );
}

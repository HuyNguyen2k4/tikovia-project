import { updateOnlineStatusBatch } from "@src/store/userSlice";
import { useEffect } from "react";

import { useDispatch, useSelector } from "react-redux";
import { io } from "socket.io-client";

// nếu dùng redux để lấy userId

const SOCKET_URL = import.meta.env.VITE_API_SOCKET_URL; // Đổi thành URL backend của bạn

function useUserStatusSocket() {
  const dispatch = useDispatch();

  const userId = useSelector((state) => state.auth.user?.id); // Lấy userId từ redux hoặc context
  useEffect(() => {
    if (!userId) return;
    const socket = io(SOCKET_URL);
    // Khi user login hoặc vào app, báo online
    socket.emit("user:online", userId);
    socket.on("users:status", (statusList) => {
      dispatch(updateOnlineStatusBatch(statusList));
    });
    // Khi tab/browser đóng, báo offline (socket tự disconnect)
    window.addEventListener("beforeunload", () => {
      socket.disconnect();
    });

    return () => {
      socket.disconnect();
    };
  }, [userId]);
}

export default useUserStatusSocket;

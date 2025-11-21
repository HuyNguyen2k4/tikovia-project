import { useEffect } from "react";

import { addNotification } from "@src/store/notificationSlice";
// import { notification as notificationAntd } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_SOCKET_URL;

export default function useNotificationSocket() {
  const userId = useSelector((state) => state.auth.user?.id);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!userId) return;
    const socket = io(SOCKET_URL);

    // Join phòng riêng của user để nhận thông báo
    socket.emit("notification:join", userId);

    // Nhận thông báo mới từ server
    socket.on("notification:new", (notification) => {
      dispatch(addNotification(notification));
      // Có thể hiện popup/toast ở đây
      // notificationAntd.success({
      //   message: "Bạn có thông báo mới:",
      //   description: notification.body,
      //   duration: 3,
      //   showProgress: true,
      // });
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, dispatch]);
}

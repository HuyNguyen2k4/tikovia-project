import React, { useEffect } from "react";

import { createChat } from "@n8n/chat";
import "@n8n/chat/style.css";

import "./ChatCustom.css";

let chatInitialized = false;
const ChatWidget = ({ webhookUrl, options = {}, isAuthenticated }) => {
  useEffect(() => {
    if (isAuthenticated && !chatInitialized) {
      createChat({
        webhookUrl: webhookUrl,
        ...options,
        i18n: {
          en: {
            title: "🤖 Tikobot",
            subtitle: "",
            getStarted: "Bắt đầu trò chuyện",
            inputPlaceholder: "Nhập câu hỏi...",
          },
        },
        loadPreviousSession: true,
        allowFileUploads: true,
        initialMessages: ["Xin chào!", "Tôi tên là Tikobot. Tôi có thể giúp gì cho bạn?"],
        // showWelcomeScreen: true,
      });
      chatInitialized = true;
    }
    // Khi logout, đóng widget và xóa toàn bộ DOM liên quan
    if (!isAuthenticated) {
      if (window.n8nChatWidget && window.n8nChatWidget.close) window.n8nChatWidget.close();
      // Xóa tất cả các phần tử liên quan đến chat widget
      document
        .querySelectorAll(
          ".n8n-chat-widget, .chat-window-wrapper, .n8n-chat, .chat-window-toggle, #n8n-chat"
        )
        .forEach((el) => {
          if (el && el.parentNode) el.parentNode.removeChild(el);
        });
      // Xóa luôn các phần tử chat còn sót lại
      document.querySelectorAll('[class*="chat-window"]').forEach((el) => {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });
      chatInitialized = false;
    }
    // Không cần cleanup vì widget dạng popup chỉ cần khởi tạo 1 lần
  }, [webhookUrl, options, isAuthenticated]);

  // Nếu bạn dùng mode 'fullscreen' với target, bạn cần render div đó ở đây:
  // return <div id="n8n-chat-container" style={{height: '100%', width: '100%'}}></div>;
  // Trong trường hợp này, vẫn là dạng popup, nên return null là hợp lý.
  return null;
};

export default ChatWidget;

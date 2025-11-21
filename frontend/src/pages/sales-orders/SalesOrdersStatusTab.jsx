import React from "react";

import { Steps } from "antd";

// Mảng định nghĩa luồng trạng thái chính (loại bỏ 'cancelled' khỏi luồng chính)
const statusOrderFlow = [
  "draft",
  "pending_preparation",
  "assigned_preparation",
  "confirmed",
  "prepared",
  "delivering",
  "delivered",
  "completed",
];

const statusLabels = {
  draft: "Nháp",
  pending_preparation: "Chờ chuẩn bị",
  assigned_preparation: "Đang phân công",
  confirmed: "Xác nhận",
  prepared: "Chờ giao hàng",
  delivering: "Đang giao",
  delivered: "Đã giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy", // Vẫn giữ label cho trạng thái hủy
};

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

const SalesOrdersStatusTab = ({ orderData = {} }) => {
  const currentStatus = orderData.status || "draft";
  const isCancelled = currentStatus === "cancelled";

  // Xác định bước hiện tại trong luồng chính
  // Nếu bị hủy, bước hiện tại là -1 (không có bước nào "đang xử lý")
  const currentStepIndex = isCancelled ? -1 : statusOrderFlow.indexOf(currentStatus);

  /**
   * Lấy mô tả (thời gian) cho một bước cụ thể
   * @param {string} statusKey - Key của trạng thái (ví dụ: 'prepared')
   * @param {number} stepIndex - Chỉ số của bước trong mảng statusOrderFlow
   * @returns {string|undefined} - Chuỗi thời gian đã định dạng hoặc undefined
   */
  const getStepDescription = (statusKey, stepIndex) => {
    // 1. Các mốc thời gian quan trọng, cố định
    if (statusKey === "draft") {
      return formatDate(orderData.createdAt);
    }
    if (statusKey === "prepared" && orderData.preparedAt) {
      return formatDate(orderData.preparedAt);
    }
    if (statusKey === "delivered" && orderData.deliveredAt) {
      return formatDate(orderData.deliveredAt);
    }
    if (statusKey === "completed" && orderData.completedAt) {
      return formatDate(orderData.completedAt);
    }

    // 2. Chỉ hiển thị thời gian cho bước "đang xử lý" (process)
    //    nếu đó là một bước trung gian (không có mốc thời gian riêng)
    const inBetweenSteps = [
      "pending_preparation",
      "assigned_preparation",
      "confirmed",
      "delivering",
    ];
    if (inBetweenSteps.includes(statusKey) && stepIndex === currentStepIndex) {
      // Dùng updatedAt vì đó là lúc nó chuyển sang trạng thái này
      return formatDate(orderData.updatedAt);
    }

    // 3. Nếu bị hủy, hiển thị thời gian hủy tại bước bị hủy
    //    (Chúng ta giả định bước bị hủy là bước ngay sau bước hoàn thành cuối cùng)
    //    Logic này sẽ được xử lý ở <Steps.Step> đặc biệt cho 'cancelled'

    // Trả về undefined cho các bước trong tương lai hoặc các bước trung gian đã qua
    return undefined;
  };

  return (
    <div style={{ padding: 24 }}>
      {" "}
      {/* Tăng padding cho đẹp hơn */}
      <Steps current={currentStepIndex} direction="vertical" size="small">
        {statusOrderFlow.map((st, idx) => {
          let stepStatus = "wait";
          if (isCancelled) {
            // Nếu đơn bị hủy, kiểm tra xem bước này đã được hoàn thành CHƯA
            // Dựa trên các mốc thời gian có thật
            if (st === "draft" && orderData.createdAt) stepStatus = "finish";
            if (st === "prepared" && orderData.preparedAt) stepStatus = "finish";
            if (st === "delivered" && orderData.deliveredAt) stepStatus = "finish";
            if (st === "completed" && orderData.completedAt) stepStatus = "finish";

            // Đặc biệt: nếu `draft` và `createdAt` tồn tại, nó luôn `finish`
            if (st === "draft" && orderData.createdAt) stepStatus = "finish";
          } else {
            // Logic cho đơn hàng đang chạy bình thường
            if (idx < currentStepIndex) stepStatus = "finish";
            else if (idx === currentStepIndex) stepStatus = "process";
          }

          return (
            <Steps.Step
              key={st}
              title={statusLabels[st] || st}
              description={getStepDescription(st, idx)}
              status={stepStatus}
            />
          );
        })}

        {/* Thêm một bước "Đã hủy" riêng biệt ở cuối nếu đơn hàng bị hủy */}
        {isCancelled && (
          <Steps.Step
            key="cancelled"
            title={statusLabels["cancelled"]}
            description={formatDate(orderData.updatedAt)} // Thời gian hủy là lúc cập nhật cuối cùng
            status="error"
          />
        )}
      </Steps>
      {/* Không cần phần legend (chú thích) bằng Tag nữa
          vì các icon của Steps (check xanh, xoay tròn xanh, X đỏ) đã đủ rõ ràng
      */}
    </div>
  );
};

export default SalesOrdersStatusTab;

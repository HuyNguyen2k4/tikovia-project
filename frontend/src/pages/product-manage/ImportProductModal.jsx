import React, { useState } from "react";

import { DownloadOutlined, InboxOutlined } from "@ant-design/icons";
import { importProductExcel } from "@src/services/excelService";
import { Button, Modal, Spin, Typography, Upload, message, notification } from "antd";

const { Text } = Typography;
const { Dragger } = Upload;

const ImportProductModal = ({ visible, onCancel, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const templateUrl = "/templates/Template.xlsx";

  const handleDownloadTemplate = () => {
    window.open(templateUrl, "_blank");
  };

  const uploadProps = {
    name: "file",
    multiple: false,
    accept: ".xlsx,.xls",
    showUploadList: false,
    beforeUpload: async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      setLoading(true);
      try {
        await importProductExcel(formData);
        notification.success({ message: `Nhập file thành công: ${file.name}` });

        onSuccess(); // Gọi callback khi import thành công
        onCancel(); // Đóng modal sau khi import thành công (nếu muốn)
      } catch (err) {
        console.log(err?.response?.data?.message);
        notification.error({
          message: "Nhập file thất bại!",
          description: err?.response?.data?.message || "Đã xảy ra lỗi khi nhập file.",
        });
      } finally {
        setLoading(false);
      }
      return false; // Không upload tự động
    },
  };

  return (
    <Modal open={visible} onCancel={onCancel} footer={null} title="Nhập file sản phẩm" width={500}>
      <Spin spinning={loading} tip="Đang nhập file...">
        <Text>
          Vui lòng tải file mẫu, điền thông tin sản phẩm theo đúng định dạng, sau đó chọn file để
          nhập vào hệ thống.
        </Text>
        <div style={{ margin: "16px 0", textAlign: "center" }}>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleDownloadTemplate}
            disabled={loading}
          >
            Tải file mẫu Excel
          </Button>
        </div>
        <Dragger
          {...uploadProps}
          style={{
            marginTop: 16,
            minHeight: 250,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
          disabled={loading}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Kéo thả file vào đây hoặc bấm để chọn file Excel</p>
          <p className="ant-upload-hint" style={{ fontSize: 12 }}>
            Chỉ chấp nhận file .xlsx, .xls
          </p>
        </Dragger>
      </Spin>
    </Modal>
  );
};

export default ImportProductModal;

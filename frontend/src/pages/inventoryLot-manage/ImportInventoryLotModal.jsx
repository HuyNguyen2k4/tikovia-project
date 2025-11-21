import React from "react";

import { DownloadOutlined, InboxOutlined } from "@ant-design/icons";
import { Button, Modal, Typography, Upload, message } from "antd";
import { importInventoryLotExcel } from "@src/services/excelService";

const { Text } = Typography;
const { Dragger } = Upload;

const ImportInventoryLotModal = ({ visible, onCancel }) => {
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

      try {
        await importInventoryLotExcel(formData);
        message.success(`Nhập file thành công: ${file.name}`);
        onCancel(); // Đóng modal sau khi import thành công (nếu muốn)
      } catch (err) {
        message.error("Nhập file thất bại!");
      }
      return false; // Không upload tự động
    },
  };

  return (
    <Modal open={visible} onCancel={onCancel} footer={null} title="Nhập file lô hàng" width={500}>
      <Text>
        Vui lòng tải file mẫu, điền thông tin lô hàng theo đúng định dạng, sau đó chọn file để nhập
        vào hệ thống.
      </Text>
      <div style={{ margin: "16px 0", textAlign: "center" }}>
        <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
          Tải file mẫu Excel
        </Button>
      </div>
      <Dragger {...uploadProps} style={{ marginTop: 16 }}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Kéo thả file vào đây hoặc bấm để chọn file Excel</p>
        <p className="ant-upload-hint" style={{ fontSize: 12 }}>
          Chỉ chấp nhận file .xlsx, .xls
        </p>
      </Dragger>
    </Modal>
  );
};

export default ImportInventoryLotModal;

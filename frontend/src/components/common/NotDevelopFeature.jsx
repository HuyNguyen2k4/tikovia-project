import React from "react";

import { Typography } from "antd";

const { Title } = Typography;
function NotDevelopFeature() {
  return (
    <div>
      <Title level={3}>Chức năng này đang được phát triển. Vui lòng quay lại sau.</Title>
    </div>
  );
}

export default NotDevelopFeature;

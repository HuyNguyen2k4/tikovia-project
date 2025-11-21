import React from "react";

import "@assets/error/error.css";
import { Button, Typography } from "antd";
import { Link } from "react-router-dom";

const { Title } = Typography;

// Dashboard #29
function ErrorPage() {
  return (
    <div className="error-container">
      <div className="error-wrapper">
        <img src="/images/404_error.png" className="error-image" alt="Error" />
        <Title level={2} className="error-title">
          Looks like you’ve got lost….
        </Title>
        <Link to="/dashboard">
          <Button type="primary" htmlType="submit" block size="large" className="error-button">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default ErrorPage;

import React from 'react';
import { useSelector } from 'react-redux';
import { Result, Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

// Import các Dashboard theo role
import AdminDashboard from './AdminDashboard';
import ManagerDashboard from './ManagerDashboard';
import AccountantDashboard from './AccountantDashboard';
import SupPickerDashboard from './SupPikerDashboard';
import SellerDashboard from './SellerDashboard';
import PickerDashboard from './PickerDashboard';
import SupShipperDashboard from './SupShipperDashboard';
import ShipperDashboard from './ShipperDashboard';
/**
 * Main Dashboard Component
 * Route người dùng đến dashboard phù hợp dựa trên role
 */
const Dashboard = () => {
  const user = useSelector((state) => state.auth.user);
  const userRole = user?.role;

  // Loading state
  if (!user) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
      </div>
    );
  }

  // Route theo role
  switch (userRole) {
    case 'admin':
    return <AdminDashboard />;
    // return <ManagerDashboard />;
    // return <AccountantDashboard />;
    // return <SupPikerDashboard />;
    // return <PickerDashboard />;
    // return <SupShipperDashboard />;
    // return <ShipperDashboard />;
    // return <SellerDashboard />;

    case 'manager':
      return <ManagerDashboard />;

    case 'accountant':
      return <AccountantDashboard />;

    case 'sup_picker':
      return <SupPickerDashboard />;

    case 'picker':
      return <PickerDashboard />;

    case 'sup_shipper':
      return <SupShipperDashboard />;

    case 'shipper':
      return <ShipperDashboard />;

    case 'seller':
      // return <StaffDashboard />;
      return <SellerDashboard />;

    default:
      return (
        <Result
          status="403"
          title="403"
          subTitle="Xin lỗi, bạn không có quyền truy cập trang này."
        />
      );
  }
};

export default Dashboard;

import React from "react"
import { Card, Col, List, Divider, Badge, Typography, Row } from "antd"
import { ExclamationCircleOutlined, TruckOutlined, ReloadOutlined, CheckCircleOutlined } from "@ant-design/icons"
import { mockAlerts, mockActivities } from "./mockData"
const { Text } = Typography

const Notification = () => {
  return (
        <Card title="Thông báo" bordered={false}>
          <List size="small" dataSource={mockAlerts} renderItem={(a) => (
            <List.Item>
              <List.Item.Meta
                avatar={
                  a.type === 'error' ? <Badge status="error" /> :
                    a.type === 'warning' ? <Badge status="warning" /> :
                      a.type === 'success' ? <Badge status="success" /> :
                        <Badge status="processing" />
                }
                title={
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {a.type === 'error' ? <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} /> :
                      a.type === 'warning' ? <TruckOutlined style={{ color: '#faad14' }} /> :
                        a.type === 'success' ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> :
                          <ReloadOutlined style={{ color: '#1677ff' }} />}
                    <Text strong>{a.title}</Text>
                    <Text type="secondary" style={{ marginLeft: 'auto' }}>{a.time}</Text>
                  </span>
                }
                description={<Text type="secondary">{a.desc}</Text>}
              />
            </List.Item>
          )} />
          <Divider style={{ margin: '12px 0' }} />
          <Card title="Hoạt động gần đây" size="small" bordered={false}>
            <List size="small" dataSource={mockActivities} renderItem={(t) => <List.Item>{t}</List.Item>} style={{ maxHeight: 260, overflow: 'auto' }} />
          </Card>
        </Card>
  )
}
export default Notification;
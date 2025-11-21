import React, { forwardRef } from "react";

import { Table } from "antd";

const SalesInvoicePrintView = forwardRef(
  ({ salesInvoice, formatCurrency, formatTax, formatDate }, ref) => {
    if (!salesInvoice) return null;

    // Các dòng sản phẩm (in thủ công chứ không dùng Ant Table để giống hóa đơn)
    const renderItems = () =>
      salesInvoice.items?.map((it, idx) => (
        <tr key={idx}>
          <td style={{ width: "30%", textAlign: "left" }}>{it.productName}</td>
          <td style={{ width: "20%", textAlign: "center" }}>{it.qty}</td>
          <td style={{ width: "20%", textAlign: "right" }}>{formatCurrency(it.unitPrice)}</td>
          <td style={{ width: "30%", textAlign: "right" }}>
            {formatCurrency(it.unitPrice * it.qty)}
          </td>
        </tr>
      ));
    return (
      <div
        ref={ref}
        style={{
          width: "80mm",
          padding: "10px",
          background: "#fff",
          color: "#000",
          fontFamily: "monospace",
          fontSize: "12px",
          lineHeight: "1.4",
          margin: "0 auto",
        }}
      >
        {/* Header cửa hàng */}
        <div style={{ textAlign: "center", marginBottom: "8px" }}>
          <div>Tikovia ĐN, Thôn Quang Châu, Xã Hoà Châu</div>
          <div>Huyện Hoà Vang, thành phố Đà Nẵng</div>
          <div>ĐT: 0702 536 927</div>
        </div>

        <div
          style={{
            textAlign: "center",
            borderTop: "1px dashed #000",
            borderBottom: "1px dashed #000",
            padding: "4px 0",
            marginBottom: "8px",
          }}
        >
          <strong>HÓA ĐƠN BÁN HÀNG</strong>
        </div>

        {/* Thông tin hóa đơn */}
        <table style={{ width: "100%" }}>
          <tbody>
            <tr>
              {/* Nhãn (Label) */}
              <td style={{ textAlign: "left" }}>Ngày bán:</td>
              {/* Giá trị (Value) */}
              <td style={{ textAlign: "right" }}>{formatDate(salesInvoice.createdAt)}</td>
            </tr>
            <tr>
              <td style={{ textAlign: "left" }}>HĐ:</td>
              <td style={{ textAlign: "right" }}>{salesInvoice.invoiceNo}</td>
            </tr>
          </tbody>
        </table>

        <hr style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

        {/* Bảng sản phẩm */}
        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Mặt hàng</th>
              <th style={{ textAlign: "center" }}>SL</th>
              <th style={{ textAlign: "right" }}>Đ.Giá</th>
              <th style={{ textAlign: "right" }}>T.Tiền</th>
            </tr>
          </thead>
          <tbody>{renderItems()}</tbody>
        </table>

        <hr style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

        {/* Tổng kết */}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>TỔNG TIỀN</span>
          <span>{formatCurrency(salesInvoice.subtotal)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>KHUYẾN MÃI</span>
          <span>-{formatCurrency(salesInvoice.discountAmount)}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>THUẾ</span>
          <span>{formatTax(salesInvoice.taxAmount)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>PHỤ PHÍ</span>
          <span>{formatCurrency(salesInvoice.surcharge)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>TỔNG TIỀN T.TOÁN</span>
          <span>{formatCurrency(salesInvoice.expectedReceivables)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>TIỀN KHÁCH TRẢ</span>
          <span>{formatCurrency(salesInvoice.actualReceivables)}</span>
        </div>
        {/* <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>TIỀN TRẢ LẠI</span>
        <span>{formatCurrency(salesInvoice.expectedReceivables - salesInvoice.actualReceivables)}</span>
      </div> */}

        <div style={{ fontStyle: "italic", marginTop: "4px" }}>(Giá đã bao gồm thuế GTGT)</div>

        <hr style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

        {/* Dưới cùng */}
        <table style={{ width: "100%" }}>
          <tbody>
            <tr>
              {/* Nhãn (Label) */}
              <td style={{ textAlign: "left" }}>Mã KH:</td>
              {/* Giá trị (Value) */}
              <td style={{ textAlign: "right" }}>{salesInvoice.customerCode || "---"}</td>
            </tr>
            <tr>
              <td style={{ textAlign: "left" }}>Số tham chiếu:</td>
              <td style={{ textAlign: "right" }}>{salesInvoice.invoiceNo}</td>
            </tr>
          </tbody>
        </table>

        <div
          style={{
            textAlign: "center",
            borderTop: "1px dashed #000",
            paddingTop: "4px",
            marginTop: "6px",
          }}
        >
          <div>Chỉ xuất hóa đơn trong ngày</div>
          <div style={{ marginTop: "4px" }}>CẢM ƠN QUÝ KHÁCH VÀ HẸN GẶP LẠI</div>
          <div style={{ marginTop: "2px" }}>
            Hotline: 0702 536 927
            <br />
            www.tikovia.vn
          </div>
        </div>
      </div>
    );
  }
);

export default SalesInvoicePrintView;
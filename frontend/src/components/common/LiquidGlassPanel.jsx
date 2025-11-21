import React, { useEffect, useMemo, useRef, useState } from "react";

import { Button, theme } from "antd";

/**
 * LiquidGlassPanel — iOS-like Glass (JS)
 * - Tối ưu cho cả kích thước NHỎ: tự động hạ blur/opacity/shadow khi panel nhỏ
 * - Có thể tắt auto-scale qua prop `autoScale=false`
 */
export const LiquidGlassPanel = ({
  children,
  blur = 40,
  opacity = 0.28,
  radius,
  padding = 16,
  border = true,
  hoverLift = true,
  shadowLevel = 1,
  autoScale = true, // NEW: tự động tinh chỉnh khi panel nhỏ
  className,
  style,
}) => {
  const { token } = theme.useToken();
  const ref = useRef(null);
  const [rect, setRect] = useState({ w: 0, h: 0 });

  // === Utils ===
  function rgba(hex, alpha) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return `rgba(255,255,255,${alpha})`;
    const r = parseInt(m[1], 16);
    const g = parseInt(m[2], 16);
    const b = parseInt(m[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Observe size to switch small-mode
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const cr = e.contentRect;
        setRect({ w: cr.width, h: cr.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isSmall = autoScale && Math.min(rect.w || 9999, rect.h || 9999) < 160; // ngưỡng small

  const r = radius ?? token.borderRadiusLG;
  const baseGlass = `rgba(255,255,255,${opacity})`;

  // Token shadow
  const tokenShadow = token[`shadow${shadowLevel}Up`] || token.shadow1Up;

  // === Effective parameters (auto scale) ===
  const eff = useMemo(() => {
    if (!isSmall) {
      return {
        blur: blur,
        opacity: opacity,
        boxShadow: `${tokenShadow}, 0 10px 26px rgba(0,0,0,0.18)`,
        borderColor: rgba("#ffffff", 0.35),
        floatAnim: true,
        glossOpacity: 0.45,
        glossRadiusStop: 70,
        dropOnHover: `${tokenShadow}, 0 16px 40px rgba(0,0,0,0.22)`,
        dropDefault: `${tokenShadow}, 0 10px 26px rgba(0,0,0,0.18)`,
      };
    }
    // Small: hạ blur/opacity/shadow, bỏ float animation
    return {
      blur: Math.min(24, Math.max(16, Math.round(blur * 0.55))),
      opacity: Math.min(0.22, Math.max(0.18, opacity * 0.7)),
      boxShadow: `0 2px 6px rgba(0,0,0,0.08)`,
      borderColor: rgba("#ffffff", 0.45),
      floatAnim: false,
      glossOpacity: 0.38,
      glossRadiusStop: 58,
      dropOnHover: `0 6px 14px rgba(0,0,0,0.12)`,
      dropDefault: `0 2px 6px rgba(0,0,0,0.08)`,
    };
  }, [isSmall, blur, opacity, tokenShadow]);

  // pointer-based gloss
  const onPointerMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    el.style.setProperty("--mx", x);
    el.style.setProperty("--my", y);
  };
  const onPointerLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--mx", 0.5);
    el.style.setProperty("--my", isSmall ? 0.12 : 0.2);
  };

  return (
    <div
      ref={ref}
      className={className}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      style={{
        position: "relative",
        overflow: "hidden",
        backdropFilter: `saturate(200%) blur(${eff.blur}px)`,
        WebkitBackdropFilter: `saturate(200%) blur(${eff.blur}px)`,
        background: baseGlass.replace(/\d?\.\d+\)$/g, `${eff.opacity})`),
        borderRadius: r,
        border: border ? `1px solid ${eff.borderColor}` : undefined,
        padding,
        boxShadow: eff.boxShadow,
        transition: "transform 220ms ease, box-shadow 220ms ease",
        animation: eff.floatAnim ? "floatGlass 8s ease-in-out infinite" : undefined,
        "--mx": 0.5,
        "--my": isSmall ? 0.12 : 0.2,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!hoverLift) return;
        e.currentTarget.style.transform = isSmall ? "translateY(-2px)" : "translateY(-5px)";
        e.currentTarget.style.boxShadow = eff.dropOnHover;
      }}
      onMouseLeave={(e) => {
        if (!hoverLift) return;
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = eff.dropDefault;
      }}
    >
      {/* Inner highlight (mỏng, giữ nét khi nhỏ) */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: r,
          boxShadow: `inset 0 1px 0 ${rgba("#ffffff", isSmall ? 0.55 : 0.45)}`,
          pointerEvents: "none",
        }}
      />

      {/* Gloss reflection */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: r,
          background: `radial-gradient(circle at calc(var(--mx) * 100%) calc(var(--my) * 100%), ${rgba(
            "#ffffff",
            eff.glossOpacity
          )} 0%, transparent ${eff.glossRadiusStop}%)`,
          mixBlendMode: "screen",
          pointerEvents: "none",
          animation: isSmall ? undefined : "glossShift 10s linear infinite",
        }}
      />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>

      <style>{`
        @keyframes floatGlass {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes glossShift {
          0% { opacity: 0.35; filter: brightness(1); }
          50% { opacity: 0.50; filter: brightness(1.12); }
          100% { opacity: 0.35; filter: brightness(1); }
        }
      `}</style>
    </div>
  );
};

// === Demo preview (thêm ví dụ nhỏ) ===
export default function Demo() {
  return (
    <div
      style={{
        display: "grid",
        gap: 20,
        background: "linear-gradient(120deg,#ffffff,#eaf3ff,#0a0a0a)",
        minHeight: "100vh",
        padding: 40,
      }}
    >
      {/* Normal card */}
      <LiquidGlassPanel padding={20}>
        <h3 style={{ margin: 0 }}>Panel chuẩn</h3>
        <p style={{ marginTop: 8 }}>Tối ưu cho layout dashboard/light mode.</p>
      </LiquidGlassPanel>

      {/* Small tiles grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 12,
        }}
      >
        {["Đơn", "Kho", "Shipper", "Báo cáo", "Cài đặt", "Trợ giúp"].map((t) => (
          <LiquidGlassPanel key={t} padding={12}>
            <div
              style={{
                height: 72,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 600,
              }}
            >
              {t}
            </div>
          </LiquidGlassPanel>
        ))}
      </div>

      {/* Tiny chip buttons */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {["All", "Active", "Done", "Late", "Draft"].map((t) => (
          <LiquidGlassPanel
            key={t}
            padding={8}
            radius={999}
            style={{ minWidth: 72, textAlign: "center" }}
          >
            {t}
          </LiquidGlassPanel>
        ))}
      </div>

      {/* Floating bar */}
      <div style={{ position: "fixed", right: 24, bottom: 24, display: "flex", gap: 10 }}>
        <LiquidGlassPanel padding={10}>
          <Button shape="circle">?</Button>
        </LiquidGlassPanel>
        <LiquidGlassPanel padding={10}>
          <Button shape="circle">⚙️</Button>
        </LiquidGlassPanel>
        <LiquidGlassPanel padding={10}>
          <Button shape="circle" type="primary">
            +
          </Button>
        </LiquidGlassPanel>
      </div>
    </div>
  );
}

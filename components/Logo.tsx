interface LogoProps {
  className?: string;
  showTagline?: boolean;
}

/**
 * 屋頂輪廓往下收尖成地圖定位標的圖形，同時傳達「住家」與「找房/定位」。
 * fill="currentColor" 讓圖示顏色跟著外層文字顏色走，方便在不同情境套色。
 */
/**
 * 簡潔的房屋輪廓，刻意選擇單一、乾淨的形狀而不是複合圖形——複合設計在
 * 縮小到 nav bar／favicon 尺寸時細節會消失、變得難以辨識，單純的房屋
 * 剪影在任何尺寸下都清楚可辨。fill="currentColor" 讓圖示顏色跟著外層
 * 文字顏色走，方便在不同情境套色。
 */
export default function Logo({ className = "", showTagline = false }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width="30"
        height="30"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <path d="M50 8 L90 46 L90 92 L10 92 L10 46 Z" fill="currentColor" />
      </svg>
      <span className="flex flex-col leading-none">
        <span className="font-brand text-lg font-bold">好宅選</span>
        {showTagline && (
          <span className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.24em] text-brand-600">
            iLoveHouse
          </span>
        )}
      </span>
    </span>
  );
}

// 棋盘各类型格子的生动 SVG 矢量图标及中心舞台装饰图标
export const CELL_SVGS: Record<string, string> = {
  // 团圆门 (起点 0)
  start: `
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" class="tile-svg">
      <path d="M6 35H34V32H6V35Z" fill="#E67E22"/>
      <path d="M9 32V14H13V32H9ZM27 32V14H31V32H27Z" fill="#C0392B"/>
      <path d="M4 14C10 14 12 10 20 8C28 10 30 14 36 14L34 10C28 9 24 5 20 5C16 5 12 9 6 10L4 14Z" fill="#E74C3C"/>
      <path d="M12 18H28V23H12V18Z" fill="#F1C40F" rx="2"/>
      <circle cx="20" cy="20.5" r="1.5" fill="#C0392B"/>
      <circle cx="20" cy="7" r="2.5" fill="#F39C12"/>
    </svg>
  `,

  // 灯笼位 (1, 3, 6, 9, 12, 17)
  lantern: `
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" class="tile-svg">
      <path d="M20 3V8M20 32V38" stroke="#F39C12" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="20" cy="20" rx="11" ry="12" fill="url(#lantern-grad)"/>
      <path d="M15 8H25V11H15V8ZM15 29H25V32H15V29Z" fill="#D35400" rx="1"/>
      <ellipse cx="20" cy="20" rx="5" ry="12" stroke="#FFD32A" stroke-width="1.2" fill="none" opacity="0.6"/>
      <circle cx="20" cy="20" r="4" fill="#FFF275" opacity="0.8"/>
      <defs>
        <radialGradient id="lantern-grad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#FF5252"/>
          <stop offset="70%" stop-color="#E02424"/>
          <stop offset="100%" stop-color="#990000"/>
        </radialGradient>
      </defs>
    </svg>
  `,

  // 灯谜站 (2, 16, 25, 31, 35, 39)
  riddle: `
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" class="tile-svg">
      <rect x="10" y="6" width="20" height="24" rx="3" fill="#FFF9E6" stroke="#9B59B6" stroke-width="2"/>
      <path d="M14 12H26M14 17H26M14 22H21" stroke="#8E44AD" stroke-width="2" stroke-linecap="round"/>
      <circle cx="26" cy="25" r="5" fill="#F1C40F"/>
      <text x="26" y="28" font-size="7" font-weight="900" fill="#7D3C98" text-anchor="middle">?</text>
      <path d="M20 30V36M17 36H23" stroke="#8E44AD" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `,

  // 知识问 (7, 14, 18, 24, 29, 33, 37)
  knowledge: `
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" class="tile-svg">
      <path d="M20 6C13.5 6 10 10.5 10 16C10 20 13 22.5 15 25V28H25V25C27 22.5 30 20 30 16C30 10.5 26.5 6 20 6Z" fill="#F9CA24"/>
      <circle cx="17" cy="14" r="2" fill="#FFFFFF" opacity="0.6"/>
      <rect x="16" y="28" width="8" height="3" rx="1.5" fill="#4B6584"/>
      <rect x="17" y="32" width="6" height="2" rx="1" fill="#778CA3"/>
      <path d="M20 2V4M7 16H9M31 16H33M11 9L12.5 10.5M29 9L27.5 10.5" stroke="#F6B93B" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `,

  // 数学关 (4, 13, 21, 26, 36)
  math: `
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" class="tile-svg">
      <rect x="7" y="7" width="26" height="26" rx="6" fill="#20BF6B"/>
      <circle cx="14" cy="14" r="3" fill="#FFFFFF"/>
      <path d="M22 14H30M26 10V18" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M10 27H18" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M22 24L30 30M30 24L22 30" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
    </svg>
  `,

  // 赏月位 (5, 15, 23, 34, 38)
  moonview: `
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" class="tile-svg">
      <circle cx="20" cy="20" r="14" fill="#FFC312"/>
      <circle cx="20" cy="20" r="14" fill="url(#moon-glow)"/>
      <circle cx="15" cy="14" r="2.5" fill="#EE5A24" opacity="0.2"/>
      <circle cx="25" cy="23" r="3" fill="#EE5A24" opacity="0.25"/>
      <circle cx="17" cy="25" r="1.5" fill="#EE5A24" opacity="0.2"/>
      <path d="M9 29C13 25 21 26 27 28C29 28.5 33 26 35 27" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity="0.85"/>
      <defs>
        <radialGradient id="moon-glow" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stop-color="#FFF275"/>
          <stop offset="80%" stop-color="#F79F1F"/>
          <stop offset="100%" stop-color="#E58E26"/>
        </radialGradient>
      </defs>
    </svg>
  `,

  // 团圆宴 (8, 19, 27)
  feast: `
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" class="tile-svg">
      <ellipse cx="20" cy="29" rx="14" ry="4" fill="#E67E22" opacity="0.4"/>
      <path d="M8 20C8 27 13 31 20 31C27 31 32 27 32 20H8Z" fill="#EA2027"/>
      <ellipse cx="20" cy="20" rx="12" ry="4" fill="#FDA7DF"/>
      <circle cx="16" cy="18" r="3" fill="#FFFFFF"/>
      <circle cx="24" cy="18" r="3" fill="#FFFFFF"/>
      <circle cx="20" cy="16" r="3.2" fill="#FEEAA7"/>
      <path d="M15 12C15 8 17 6 17 4M21 12C21 8 23 6 23 4M25 13C25 9 27 7 27 5" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" opacity="0.8"/>
    </svg>
  `,

  // 投壶位 (10, 22, 28)
  toss: `
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" class="tile-svg">
      <path d="M16 14H24V28C24 31 22 33 20 33C18 33 16 31 16 28V14Z" fill="#795548"/>
      <path d="M14 12H26V15H14V12Z" fill="#8D6E63" rx="1"/>
      <path d="M12 16H16V22H12C10.5 22 10.5 16 12 16ZM28 16H24V22H28C29.5 22 29.5 16 28 16Z" fill="#A1887F"/>
      <line x1="13" y1="5" x2="19" y2="18" stroke="#E74C3C" stroke-width="2" stroke-linecap="round"/>
      <polygon points="12,4 16,5 14,8" fill="#F1C40F"/>
      <line x1="27" y1="5" x2="21" y2="18" stroke="#3498DB" stroke-width="2" stroke-linecap="round"/>
      <polygon points="28,4 24,5 26,8" fill="#F1C40F"/>
    </svg>
  `,

  // 兔子洞 (11, 30)
  rabbit: `
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" class="tile-svg">
      <ellipse cx="20" cy="30" rx="14" ry="6" fill="#1B4D3E"/>
      <ellipse cx="20" cy="30" rx="10" ry="4" fill="#0D281F"/>
      <ellipse cx="20" cy="20" rx="7" ry="6.5" fill="#FFFFFF"/>
      <ellipse cx="16" cy="11" rx="2.5" ry="6" fill="#FFFFFF" transform="rotate(-10 16 11)"/>
      <ellipse cx="16" cy="11" rx="1.3" ry="4" fill="#FFB8B8" transform="rotate(-10 16 11)"/>
      <ellipse cx="24" cy="11" rx="2.5" ry="6" fill="#FFFFFF" transform="rotate(10 24 11)"/>
      <ellipse cx="24" cy="11" rx="1.3" ry="4" fill="#FFB8B8" transform="rotate(10 24 11)"/>
      <circle cx="18" cy="19" r="1" fill="#333333"/>
      <circle cx="22" cy="19" r="1" fill="#333333"/>
      <polygon points="19.5,21.5 20.5,21.5 20,22.5" fill="#FF7675"/>
    </svg>
  `,

  // 月亮井 (20)
  moonwell: `
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" class="tile-svg">
      <ellipse cx="20" cy="27" rx="13" ry="8" fill="#2C3A47"/>
      <ellipse cx="20" cy="26" rx="10" ry="5.5" fill="#12CBC4"/>
      <circle cx="18" cy="25" r="2.5" fill="#F9CA24"/>
      <path d="M10 26V14M30 26V14" stroke="#778CA3" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M8 14H32" stroke="#8854D0" stroke-width="3" stroke-linecap="round"/>
      <path d="M20 14V20" stroke="#F1F2F6" stroke-width="1.5"/>
      <rect x="18" y="19" width="4" height="4" rx="1" fill="#EA2027"/>
    </svg>
  `,

  // 秋风 (32)
  wind: `
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" class="tile-svg">
      <path d="M6 18C12 18 18 14 24 14C28 14 31 16 31 19C31 22 28 24 25 24C22 24 21 22 22 20" stroke="#00d2d3" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M8 25C14 25 18 28 24 28C27 28 29 27 29 25" stroke="#48dbfb" stroke-width="2" stroke-linecap="round"/>
      <path d="M14 10C16 7 20 8 20 11C18 13 14 13 14 10Z" fill="#FF9F43"/>
      <path d="M26 8C28 6 31 7 31 9C30 11 27 10 26 8Z" fill="#EE5253"/>
    </svg>
  `,
};

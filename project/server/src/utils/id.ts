// 轻量房间码生成：时间戳 + 随机，碰撞概率可忽略（房间码仅用于单机/局域网演示）
export function genRoomCode(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`.replace(/[^a-z0-9]/gi, '');
}
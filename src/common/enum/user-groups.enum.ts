export enum UserGroup {
  PUBLIC = 0,       // 所有人，包括未登录用户
  REGISTERED = 3,   // 已注册普通用户
  FRIEND = 7,       // 朋友用户组
  Connected = 9,        // 管理员
  ADMIN = 10        // 只有自己可见
}

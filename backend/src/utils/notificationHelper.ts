import { NotificationService } from "../services/notificationService.js"
import type { NotificationType } from "../types/Notification.js"
import { broadcastNotificationToUser } from "../app.js"

interface NotifyPayload {
  type?: string
  title: string
  message: string
  txHash?: string
  data?: Record<string, any>
}

export async function notifyWithAdmins(
  executors: string | string[],
  payload: NotifyPayload,
  adminList: string[] = ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"]
) {
  const normalizedExecutors = (Array.isArray(executors) ? executors : [executors])
    .filter(Boolean)
    .map(a => a.toLowerCase())
  const normalizedAdmins = adminList.map(a => a.toLowerCase())

  const recipients = Array.from(new Set([...normalizedAdmins, ...normalizedExecutors]))

  const validTypes: NotificationType[] = ["kyc", "document", "transaction", "system", "agreement"]
  const type: NotificationType = validTypes.includes(payload.type as any)
    ? (payload.type as NotificationType)
    : "system"

  for (const user of recipients) {
    const notif = await NotificationService.notify(
      user,
      type,
      payload.title,
      payload.message,
      { txHash: payload.txHash, data: payload.data }
    )
    broadcastNotificationToUser(user, notif)
  }
}

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

/**
 * Kirim notif ke admin + executor
 */
export async function notifyWithAdmins(
  executor: string,
  payload: NotifyPayload,
  adminList: string[] = ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"]
) {
  const normalizedExecutor = executor.toLowerCase()
  const normalizedAdmins = adminList.map(a => a.toLowerCase())

  const recipients = Array.from(new Set([...normalizedAdmins, normalizedExecutor]))

  const validTypes: NotificationType[] = ["kyc", "document", "transaction", "system", "agreement"]
  const type: NotificationType = validTypes.includes(payload.type as any)
    ? (payload.type as NotificationType)
    : "system"

  for (const user of recipients) {
    const notif = await NotificationService.notify(
      user,
      normalizedExecutor,
      type,
      payload.title,
      payload.message,
      { txHash: payload.txHash, data: payload.data }
    )
    broadcastNotificationToUser(user, notif)
  }
}

/**
 * Kirim notif ke user lain (importer/exporter/dll)
 */
export async function notifyUsers(
  recipients: string | string[],
  payload: NotifyPayload,
  executor: string
) {
  const normalizedRecipients = (Array.isArray(recipients) ? recipients : [recipients])
    .filter(Boolean)
    .map(a => a.toLowerCase())

  const validTypes: NotificationType[] = ["kyc", "document", "transaction", "system", "agreement"]
  const type: NotificationType = validTypes.includes(payload.type as any)
    ? (payload.type as NotificationType)
    : "system"

  for (const user of new Set(normalizedRecipients)) {
    const notif = await NotificationService.notify(
      user,
      executor,
      type,
      payload.title,
      payload.message,
      { txHash: payload.txHash, data: payload.data }
    )
    broadcastNotificationToUser(user, notif)
  }
}

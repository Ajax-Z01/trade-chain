import { NotificationService } from "../services/notificationService.js";

/**
 * Kirim notifikasi ke admin(s) dan/atau executor
 *
 * @param executor Wallet address yang melakukan aksi
 * @param title Judul notifikasi
 * @param message Pesan notifikasi
 * @param type Tipe notifikasi (default "system")
 * @param adminList Array wallet address admin, default satu admin
 */
export async function notifyWithAdmins(
  executor: string,
  title: string,
  message: string,
  type: string = "system",
  adminList: string[] = ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"]
) {
  const normalizedExecutor = executor.toLowerCase();
  const normalizedAdmins = adminList.map((a) => a.toLowerCase());

  // Tentukan penerima
  const recipients =
    normalizedAdmins.includes(normalizedExecutor)
      ? adminList
      : Array.from(new Set([...adminList, executor]));

  await Promise.all(
    recipients.map((user) =>
      NotificationService.notify(user, type as any, title, message)
    )
  );
}

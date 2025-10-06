import { User, UserRole, UserMetadata } from "../types/User.js"

export default class UserDTO {
  address: string
  role: UserRole
  createdAt: number
  lastLoginAt: number
  metadata?: UserMetadata

  constructor(data: Partial<User>) {
    if (!data.address) throw new Error("address is required")

    this.address = data.address
    this.role = data.role || "user"
    this.createdAt = data.createdAt || Date.now()
    this.lastLoginAt = data.lastLoginAt || Date.now()
    this.metadata = data.metadata || {}
  }

  toFirestore(): User {
    return {
      address: this.address,
      role: this.role,
      createdAt: this.createdAt,
      lastLoginAt: this.lastLoginAt,
      metadata: this.metadata,
    }
  }
}

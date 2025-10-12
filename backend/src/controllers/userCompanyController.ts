import { Request, Response } from "express"
import { UserCompanyModel } from "../models/userCompanyModel.js"
import type { CreateUserCompanyDTO, UpdateUserCompanyDTO } from "../types/UserCompany.js"

export class UserCompanyController {
  // --- Create new relation ---
  static async create(req: Request, res: Response) {
    try {
      const data = req.body as CreateUserCompanyDTO
      const relation = await UserCompanyModel.createUserCompany(data)
      return res.status(201).json({ success: true, data: relation })
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message })
    }
  }

  // --- Get all relations with optional search, role, status, pagination ---
  static async getAll(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1
      const limit = parseInt(req.query.limit as string) || 10
      const search = (req.query.search as string) || ''
      const role = (req.query.role as string) || ''
      const status = (req.query.status as string) || ''

      const { data, total } = await UserCompanyModel.getAllFiltered({
        page,
        limit,
        search,
        role,
        status,
      })

      return res.status(200).json({ success: true, data, total })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  // --- Get relation by ID ---
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const relation = await UserCompanyModel.getById(id)
      if (!relation) return res.status(404).json({ success: false, message: "Relation not found" })
      return res.status(200).json({ success: true, data: relation })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  // --- Get relations by user address ---
  static async getByUser(req: Request, res: Response) {
    try {
      const { address } = req.params
      const relations = await UserCompanyModel.getByUser(address)
      return res.status(200).json({ success: true, data: relations })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  // --- Get relations by company ID ---
  static async getByCompany(req: Request, res: Response) {
    try {
      const { companyId } = req.params
      const relations = await UserCompanyModel.getByCompany(companyId)
      return res.status(200).json({ success: true, data: relations })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  // --- Update relation ---
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      const data = req.body as UpdateUserCompanyDTO
      const updated = await UserCompanyModel.update(id, data)
      if (!updated) return res.status(404).json({ success: false, message: "Relation not found" })
      return res.status(200).json({ success: true, data: updated })
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message })
    }
  }

  // --- Delete relation ---
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params
      const deleted = await UserCompanyModel.delete(id)
      if (!deleted) return res.status(404).json({ success: false, message: "Relation not found" })
      return res.status(200).json({ success: true, message: "Relation deleted" })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }
}

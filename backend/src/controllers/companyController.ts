import type { Request, Response } from 'express';
import * as companyModel from '../models/companyModel.js';
import CompanyDTO from '../dtos/companyDTO.js';

// POST /company
export const createCompany = async (req: Request, res: Response) => {
  try {
    const dto = new CompanyDTO(req.body);
    dto.validate();

    const company = await companyModel.createCompany(dto.toJSON());
    res.status(201).json({ success: true, data: company });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// GET /company
export const getCompanies = async (_req: Request, res: Response) => {
  try {
    const companies = await companyModel.getCompanies();
    res.json({ success: true, data: companies });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /company/:id
export const getCompanyById = async (req: Request, res: Response) => {
  try {
    const company = await companyModel.getCompanyById(req.params.id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    res.json({ success: true, data: company });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /company/:id
export const updateCompany = async (req: Request, res: Response) => {
  try {
    const dto = new CompanyDTO(req.body);
    dto.validate();

    const updated = await companyModel.updateCompany(req.params.id, dto.toJSON());
    if (!updated) return res.status(404).json({ success: false, message: 'Company not found' });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /company/:id
export const deleteCompany = async (req: Request, res: Response) => {
  try {
    const deleted = await companyModel.deleteCompany(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Company not found' });

    res.json({ success: true, message: 'Company deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

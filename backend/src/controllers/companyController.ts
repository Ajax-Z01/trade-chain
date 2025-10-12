import type { Request, Response } from 'express';
import { CompanyModel } from '../models/companyModel.js';
import CompanyDTO from '../dtos/companyDTO.js';

// POST /company (manual/admin)
export const createCompany = async (req: Request, res: Response) => {
  try {
    const { executor, ...data } = req.body;
    if (!executor) return res.status(400).json({ success: false, message: 'Executor is required' });

    const dto = new CompanyDTO(data);
    dto.validate();

    const company = await CompanyModel.createCompany(dto.toJSON(), executor);
    res.status(201).json({ success: true, data: company });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// GET /company
export const getCompanies = async (_req: Request, res: Response) => {
  try {
    const companies = await CompanyModel.getCompanies();
    res.json({ success: true, data: companies });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /company/:id
export const getCompanyById = async (req: Request, res: Response) => {
  try {
    const company = await CompanyModel.getCompanyById(req.params.id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    res.json({ success: true, data: company });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /company/:id
export const updateCompany = async (req: Request, res: Response) => {
  try {
    const { executor, ...data } = req.body;
    if (!executor) return res.status(400).json({ success: false, message: 'Executor is required' });

    const dto = new CompanyDTO(data);
    dto.validate();

    const updated = await CompanyModel.updateCompany(req.params.id, dto.toJSON(), executor);
    if (!updated) return res.status(404).json({ success: false, message: 'Company not found' });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /company/:id
export const deleteCompany = async (req: Request, res: Response) => {
  try {
    const executor = req.body.executor || req.headers['x-executor']?.toString();
    if (!executor) return res.status(400).json({ success: false, message: 'Executor is required' });

    const deleted = await CompanyModel.deleteCompany(req.params.id, executor);
    if (!deleted) return res.status(404).json({ success: false, message: 'Company not found' });

    res.json({ success: true, message: 'Company deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

import { Router } from 'express';
import * as companyController from '../controllers/companyController.js';

const router = Router();

// Create a new company
router.post('/', companyController.createCompany);

// Get all companies
router.get('/', companyController.getCompanies);

// Get a company by ID
router.get('/:id', companyController.getCompanyById);

// Update a company by ID
router.put('/:id', companyController.updateCompany);

// Delete a company by ID
router.delete('/:id', companyController.deleteCompany);

export default router;

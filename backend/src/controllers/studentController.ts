import { Request, Response } from 'express';
import * as studentService from '../services/studentService';

/**
 * POST /api/students/create
 * Создать нового студента
 */
export async function createStudent(req: Request, res: Response) {
  try {
    const { email, full_name, phone, password, role, account_expires_at, course_ids } = req.body;

    // Validation
    if (!email || !full_name || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['email', 'full_name', 'password']
      });
    }

    const result = await studentService.createStudent({
      email,
      full_name,
      phone,
      password,
      role: role || 'student',
      account_expires_at,
      course_ids
    });

    res.json(result);
  } catch (error: any) {
    console.error('❌ Error in createStudent:', error.message);
    res.status(500).json({
      error: 'Failed to create student',
      message: error.message
    });
  }
}

/**
 * GET /api/students
 * Получить список студентов
 */
export async function getStudents(req: Request, res: Response) {
  try {
    const { search, role, isActive } = req.query;

    const students = await studentService.getStudents({
      searchTerm: search as string,
      role: role as string,
      isActive: isActive === 'true'
    });

    res.json(students);
  } catch (error: any) {
    console.error('❌ Error in getStudents:', error.message);
    res.status(500).json({
      error: 'Failed to fetch students',
      message: error.message
    });
  }
}

/**
 * GET /api/students/:id
 * Получить студента по ID
 */
export async function getStudentById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const student = await studentService.getStudentById(id);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(student);
  } catch (error: any) {
    console.error('❌ Error in getStudentById:', error.message);
    res.status(500).json({
      error: 'Failed to fetch student',
      message: error.message
    });
  }
}

/**
 * PATCH /api/students/:id
 * Обновить студента
 */
export async function updateStudent(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updates = req.body;

    const result = await studentService.updateStudent(id, updates);

    res.json(result);
  } catch (error: any) {
    console.error('❌ Error in updateStudent:', error.message);
    res.status(500).json({
      error: 'Failed to update student',
      message: error.message
    });
  }
}

/**
 * POST /api/students/:id/deactivate
 * Деактивировать студента
 */
export async function deactivateStudent(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await studentService.deactivateStudent(id, reason);

    res.json(result);
  } catch (error: any) {
    console.error('❌ Error in deactivateStudent:', error.message);
    res.status(500).json({
      error: 'Failed to deactivate student',
      message: error.message
    });
  }
}

/**
 * POST /api/students/:id/activate
 * Активировать студента
 */
export async function activateStudent(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await studentService.activateStudent(id);

    res.json(result);
  } catch (error: any) {
    console.error('❌ Error in activateStudent:', error.message);
    res.status(500).json({
      error: 'Failed to activate student',
      message: error.message
    });
  }
}


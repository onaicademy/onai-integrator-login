/**
 * Course Controller
 * Handles HTTP requests for courses
 */

import { Request, Response } from 'express';
import * as courseService from '../services/courseService';
import { CreateCourseDto, UpdateCourseDto } from '../types/courses.types';

/**
 * POST /courses - Create new course
 */
export async function create(req: Request, res: Response): Promise<void> {
  try {
    const { title, description, thumbnail_url } = req.body;

    if (!title) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    const data: CreateCourseDto = {
      title,
      description,
      thumbnail_url,
    };

    const course = await courseService.createCourse(data);
    res.status(201).json({ success: true, data: course });
  } catch (error: any) {
    console.error('[CourseController] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /courses - Get all courses
 */
export async function getAll(req: Request, res: Response): Promise<void> {
  try {
    const courses = await courseService.getAllCourses();
    res.json({ success: true, data: courses });
  } catch (error: any) {
    console.error('[CourseController] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /courses/:courseId - Get course by ID
 */
export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const { courseId } = req.params;

    if (!courseId) {
      res.status(400).json({ error: 'Course ID is required' });
      return;
    }

    const course = await courseService.getCourseById(parseInt(courseId));
    res.json({ success: true, data: course });
  } catch (error: any) {
    console.error('[CourseController] Error:', error.message);
    if (error.message === 'Course not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

/**
 * PUT /courses/:courseId - Update course
 */
export async function update(req: Request, res: Response): Promise<void> {
  try {
    const { courseId } = req.params;
    const { title, description, thumbnail_url } = req.body;

    if (!courseId) {
      res.status(400).json({ error: 'Course ID is required' });
      return;
    }

    const data: UpdateCourseDto = {
      title,
      description,
      thumbnail_url,
    };

    const course = await courseService.updateCourse(parseInt(courseId), data);
    res.json({ success: true, data: course });
  } catch (error: any) {
    console.error('[CourseController] Error:', error.message);
    if (error.message === 'Course not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

/**
 * DELETE /courses/:courseId - Delete course
 */
export async function deleteCourse(req: Request, res: Response): Promise<void> {
  try {
    const { courseId } = req.params;

    if (!courseId) {
      res.status(400).json({ error: 'Course ID is required' });
      return;
    }

    await courseService.deleteCourse(parseInt(courseId));
    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (error: any) {
    console.error('[CourseController] Error:', error.message);
    if (error.message === 'Course not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}


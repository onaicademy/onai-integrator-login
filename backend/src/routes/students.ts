import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import * as studentController from '../controllers/studentController';

const router = Router();

// Все роуты требуют аутентификацию
router.use(authenticateJWT);

// POST /api/students/create - Создать студента
router.post('/create', studentController.createStudent);

// GET /api/students - Получить список студентов
router.get('/', studentController.getStudents);

// GET /api/students/:id - Получить студента по ID
router.get('/:id', studentController.getStudentById);

// PATCH /api/students/:id - Обновить студента
router.patch('/:id', studentController.updateStudent);

// POST /api/students/:id/deactivate - Деактивировать
router.post('/:id/deactivate', studentController.deactivateStudent);

// POST /api/students/:id/activate - Активировать
router.post('/:id/activate', studentController.activateStudent);

// GET /api/students/:id/courses - Получить курсы студента
router.get('/:id/courses', studentController.getUserCourses);

// POST /api/students/:id/courses - Назначить курсы студенту
router.post('/:id/courses', studentController.assignCourses);

// DELETE /api/students/:id/courses/:courseId - Отозвать курс
router.delete('/:id/courses/:courseId', studentController.revokeCourse);

// GET /api/courses - Получить все доступные курсы
router.get('/courses/all', studentController.getAllCourses);

export default router;


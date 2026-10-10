import { Router, type NextFunction, type Request, type Response } from "express";
import { zEnrollmentBody, zEnrollmentPutBody } from "../libs/zodValidators.ts";

import type { Course, CustomRequest } from "../libs/types.ts";

// import authentication middleware
import { authenticateToken } from "../middlewares/authenMiddleware.ts";
import { checkRoles } from "../middlewares/checkRolesDBMiddleware.ts";
import { checkRoleAdmin } from "../middlewares/checkRoleAdminDBMiddleware.ts";
// import database
import { PrismaClient } from "../../generated/prisma/client.ts";
const prisma = new PrismaClient();

const router = Router();

// GET /api/v3/enrollments
// ADMIN: get all enrollments, STUDENT: get only his own enrollments
router.get(
  "/",
  authenticateToken,
  checkRoles,
  async (req: CustomRequest, res: Response) => {
    try {
      const user = req.user;
      const enrollments = await prisma.enrollment.findMany({
        where:
          user?.role === "STUDENT" ? { studentId: user.studentId ?? "" } : {},
        orderBy: { createdAt: "asc" },
      });

      return res.json({
        success: true,
        data: enrollments,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  },
);

// POST /api/v3/enrollments, body = {studentId, courseId}
// ADMIN: enroll any student, STUDENT: enroll only himself
router.post(
  "/",
  authenticateToken,
  checkRoles,
  async (req: CustomRequest, res: Response) => {
    try {
      // validate req.body
      const result = zEnrollmentBody.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }
      const { studentId, courseId } = result.data;

      // STUDENT can enroll only himself
      const user = req.user;
      if (user?.role === "STUDENT" && studentId !== user.studentId) {
        return res.status(403).json({
          success: false,
          message: "Forbidden access",
        });
      }

      // check if student and course exist
      const student = await prisma.student.findUnique({
        where: { studentId },
      });
      if (!student) {
        return res.status(404).json({
          success: false,
          message: `Student ${studentId} does not exists`,
        });
      }
      const course = await prisma.course.findUnique({ where: { courseId } });
      if (!course) {
        return res.status(404).json({
          success: false,
          message: `Course ${courseId} does not exists`,
        });
      }

      // check if the student already enrolled in this course
      const enrolled = await prisma.enrollment.findFirst({
        where: { studentId, courseId },
      });
      if (enrolled) {
        return res.status(409).json({
          success: false,
          message: `Student ${studentId} has already enrolled in ${courseId}`,
        });
      }

      const created = await prisma.enrollment.create({
        data: { studentId, courseId },
      });

      return res.status(201).json({
        success: true,
        data: created,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  },
);

router.put(
  "/",
  authenticateToken,
  checkRoles,
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (user?.role == 'ADMIN') {
        return next('route');
      }
      const result = zEnrollmentPutBody.safeParse(await req.body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }


      if (result.data.courseId === result.data.newCourseId) {
        return res.status(400);
      }
      if (result.data.studentId !== user?.studentId) {
        return res.status(403);
      }
      const have = await prisma.enrollment.findMany({
        where: {
          studentId: result.data.studentId,
          courseId: result.data.courseId
        }
      })
      if (have.length == 0) {
        return res.status(404);
      }
      const newHaveInCourse = await prisma.course.findMany({
        where: {
          courseId: result.data.newCourseId
        }
      })
      if (newHaveInCourse.length == 0) {
        return res.status(404);
      }
      const newEnrolled = await prisma.enrollment.findMany({
        where: {
          studentId: result.data.studentId,
          courseId: result.data.newCourseId
        }
      })
      if (newEnrolled.length != 0) {
        return res.status(409);
      }

      const enrollments = await prisma.enrollment.updateMany({
        where: {
          studentId: result.data.studentId,
          courseId: result.data.courseId
        },
        data: {
          courseId: result.data.newCourseId
        }
      });

      const whatChange = await prisma.enrollment.findMany({
        where: {
          studentId: result.data.studentId,
          courseId: result.data.newCourseId
        }
      })

      return res.status(200).json({
        success: true,
        data: {
          courseId: whatChange[0].courseId,
          StudentId: whatChange[0].studentId
        },
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  },
);

router.put(
  "/",
  authenticateToken,
  checkRoleAdmin,
  async (req: CustomRequest, res: Response) => {
    try {
      const user = req.user;
      const result = zEnrollmentPutBody.safeParse(await req.body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }

      if (result.data.courseId === result.data.newCourseId) {
        return res.status(400);
      }
      const have = await prisma.enrollment.findMany({
        where: {
          studentId: result.data.studentId,
          courseId: result.data.courseId
        }
      })
      if (have.length == 0) {
        return res.status(404);
      }
      const newHaveInCourse = await prisma.course.findMany({
        where: {
          courseId: result.data.newCourseId
        }
      })
      if (newHaveInCourse.length == 0) {
        return res.status(404);
      }
      const newEnrolled = await prisma.enrollment.findMany({
        where: {
          studentId: result.data.studentId,
          courseId: result.data.newCourseId
        }
      })
      if (newEnrolled.length != 0) {
        return res.status(409);
      }

      const enrollments = await prisma.enrollment.updateMany({
        where: {
          studentId: result.data.studentId,
          courseId: result.data.courseId
        },
        data: {
          courseId: result.data.newCourseId
        }
      });

      const whatChange = await prisma.enrollment.findMany({
        where: {
          studentId: result.data.studentId,
          courseId: result.data.newCourseId
        }
      })

      return res.status(200).json({
        success: true,
        data: {
          courseId: whatChange[0].courseId,
          StudentId: whatChange[0].studentId
        },
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  },
);

//router.delete( // admin
//  "/",
//  authenticateToken,
//  checkRoleAdmin,
//  async (req: CustomRequest, res: Response) => {
//    try {
//      const user = req.user;
//      const result = zEnrollmentPutBody.safeParse(await req.body);
//      if (!result.success) {
//        return res.status(400).json({
//          success: false,
//          message: "Validation failed",
//          errors: result.error.issues[0]?.message,
//        });
//      }
//      const allEnrolled = await prisma.enrollment.findMany({
//      })
//
//      const enrollments = await prisma.enrollment.findMany({
//        where:
//          user?.role === "STUDENT" ? { studentId: user.studentId ?? "" } : {},
//        orderBy: { createdAt: "asc" },
//      });
//
//      return res.json({
//        success: true,
//        data: enrollments,
//      });
//    } catch (err) {
//      return res.status(500).json({
//        success: false,
//        message: "Something is wrong, please try again",
//        error: err,
//      });
//    }
//  },
//);

router.delete( // non-admin
  "/",
  authenticateToken,
  checkRoles,
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (user?.role == 'ADMIN') {
        return next('route');
      }
      const result = zEnrollmentBody.safeParse(await req.body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }
      if (req.user?.studentId != result.data.studentId) {
        return res.status(403);
      }
      const have = await prisma.enrollment.findMany({
        where: {
          ...(result.data.courseId ? { courseId: result.data.courseId } : {}),
          ...(user?.role === "STUDENT" ? { studentId: user.studentId ?? "" } : {}),
        },
      });
      if (have.length == 0) {
        return res.status(404);
      }

      const deleted = await prisma.enrollment.deleteMany({
        where: {
          studentId: result.data.studentId,
          courseId: result.data.courseId
        }
      })

      return res.status(200).json({
        success: true,
        data: deleted,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  },
);

router.delete(
  "/",
  authenticateToken,
  checkRoleAdmin,
  async (req: CustomRequest, res: Response) => {
    try {
      const user = req.user;
      const result = zEnrollmentBody.safeParse(await req.body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }

      const have = await prisma.enrollment.findMany({
        where: {
          ...(result.data.courseId ? { courseId: result.data.courseId } : {}),
          ...(user?.role === "STUDENT" ? { studentId: user.studentId ?? "" } : {}),
        },
      });
      if (have.length == 0) {
        return res.status(404);
      }

      const deleted = await prisma.enrollment.deleteMany({
        where: {
          studentId: result.data.studentId,
          courseId: result.data.courseId
        }
      })

      return res.status(200).json({
        success: true,
        data: deleted,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  },
);






// TODO การบ้าน 2.1: PUT /api/v3/enrollments, body = {studentId, courseId, newCourseId}
//   เปลี่ยนวิชาที่ลงทะเบียนไว้ (courseId → newCourseId)
//   - ADMIN แก้ได้ทุกคน / STUDENT แก้ได้แค่ของตัวเอง (403)
//   - validate body (400), ยังไม่ได้ลงวิชาเดิม (404), วิชาใหม่ = วิชาเดิม (400),
//     วิชาใหม่ไม่มีจริง (404), ลงวิชาใหม่ไว้แล้ว (409)

// TODO การบ้าน 2.2: DELETE /api/v3/enrollments, body = {studentId, courseId}
//   ยกเลิกการลงทะเบียน (drop)
//   - ADMIN ลบได้ทุกคน / STUDENT ลบได้แค่ของตัวเอง (403)
//   - validate body (400), ไม่พบการลงทะเบียน (404)

export default router;

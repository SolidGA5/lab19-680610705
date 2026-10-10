import { useState } from "react";
import { ArrowLeftRight, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthStore } from "@/lib/auth-store";
import { useEnrollmentStore } from "@/lib/enrollment-store";
import { ConfirmDeleteButton } from "@/components/confirm-button";

export default function StudentEnrollmentsPage() {
  const studentId = useAuthStore((s) => s.studentId);
  const { students, courses, enrollments, enroll, updateEnrollment, dropEnrollment } = useEnrollmentStore();
  const [open, setOpen] = useState(false);
  const [formCourse, setFormCourse] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const me = students.find((s) => s.studentId === studentId);
  const myEnrollments = enrollments.filter((e) => e.studentId === studentId);

  const courseOptions = courses
    .filter((c) => !myEnrollments.some((e) => e.courseId === c.courseId))
    .map((c) => ({
      value: c.courseId,
      label: `${c.courseId} — ${c.courseTitle}`,
    }));

  const courseOf = (courseId: string) =>
    courses.find((c) => c.courseId === courseId);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setFormCourse(null);
      setServerError(null);
    }
  };

  const handleDelete = async (studentId: string, courseId: string) => {
    try {
      await dropEnrollment(studentId, courseId);
    }
    catch (err) {
      setServerError((err as Error).message);
    }
  }

  const hd = (studentId: string, courseId: string) => {
    handleDelete(studentId, courseId);
  }


  const handleEnroll = async () => {
    if (!studentId || !formCourse) return;
    setSubmitting(true);
    setServerError(null);
    try {
      await enroll(studentId, formCourse);
      handleOpenChange(false);
    } catch (err) {
      setServerError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  function ChangeEnrollment({ id }: { id: string }) {
    const [open2, setOpen2] = useState(false);
    const [changing, setChanging] = useState(false);
    const [newCourse, setNewCourse] = useState<string | null>(null);
    const handleOpenChange2 = (next: boolean) => {
      setOpen2(next);
      if (!next) {
        setNewCourse(null);
        setServerError(null);
      }

    }
    const handleEnrollChange = async (studentId: string, courseId: string, newCourseId: string) => {
      if (!studentId || !newCourse) return;
      setChanging(true);
      setServerError(null);
      try {
        await updateEnrollment(studentId, courseId, newCourseId);
        handleOpenChange2(false);
      } catch (err) {
        setServerError((err as Error).message);
      } finally {
        setChanging(false);
      }
    }


    return <Dialog open={open2} onOpenChange={handleOpenChange2}>
      <DialogTrigger render={<Button variant="ghost" size="icon"><ArrowLeftRight></ArrowLeftRight></Button>}>
        <PlusCircle className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>เปลี่ยนวิชา {id}</DialogTitle>
          <DialogDescription>
            เลือกวิชาใหม่แทนวิชา {id} (เลือกได้เฉพาะวิชาที่ยังไม่ได้ลงทะเบียน)
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label htmlFor="newCourse">วิชาใหม่</Label>
          <Select
            items={courseOptions}
            value={newCourse}
            onValueChange={(v) => setNewCourse(v as string)}
          >
            <SelectTrigger id="newCourse" className="w-full">
              <SelectValue
                placeholder={
                  courseOptions.length === 0
                    ? "ลงทะเบียนครบทุกวิชาแล้ว"
                    : "เลือกวิชา"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {courseOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {serverError && (
          <p className="text-sm text-destructive">{serverError}</p>
        )}
        <DialogFooter>
          <Button
            disabled={!newCourse || changing}
            onClick={() => handleEnrollChange(studentId as string, id, newCourse as string)}
          >
            <ArrowLeftRight className="h-4 w-4" />
            {changing ? "กำลังงบันทึก..." : "บันทึก"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog >
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">จัดการการลงทะเบียน</h1>
          <p className="text-sm text-muted-foreground">
            {me
              ? `${me.studentId} — ${me.firstName} ${me.lastName} (${me.program})`
              : (studentId ?? "-")}{" "}
            · ลงทะเบียนแล้ว {myEnrollments.length} วิชา
          </p>
        </div>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger render={<Button disabled={!studentId} />}>
            <PlusCircle className="h-4 w-4" />
            ลงทะเบียนเรียน
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>ลงทะเบียนเรียน</DialogTitle>
              <DialogDescription>
                เลือกวิชาที่ยังไม่ได้ลงทะเบียน
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-1.5">
              <Label htmlFor="formCourse">วิชา</Label>
              <Select
                items={courseOptions}
                value={formCourse}
                onValueChange={(v) => setFormCourse(v as string)}
              >
                <SelectTrigger id="formCourse" className="w-full">
                  <SelectValue
                    placeholder={
                      courseOptions.length === 0
                        ? "ลงทะเบียนครบทุกวิชาแล้ว"
                        : "เลือกวิชา"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {courseOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}
            <DialogFooter>
              <Button
                disabled={!formCourse || submitting}
                onClick={handleEnroll}
              >
                <PlusCircle className="h-4 w-4" />
                {submitting ? "กำลังลงทะเบียน..." : "ลงทะเบียน"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รหัสวิชา</TableHead>
              <TableHead>ชื่อวิชา</TableHead>
              <TableHead>ผู้สอน</TableHead>
              <TableHead>วันที่ลงทะเบียน</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {myEnrollments.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-20 text-center text-muted-foreground"
                >
                  ยังไม่ได้ลงทะเบียนวิชาใด
                </TableCell>
              </TableRow>
            )}
            {myEnrollments.map((e) => {
              const course = courseOf(e.courseId);
              return (
                <TableRow key={e.courseId}>
                  <TableCell>{e.courseId}</TableCell>
                  <TableCell>{course?.courseTitle ?? "-"}</TableCell>
                  <TableCell>{course?.instructors.join(", ") || "-"}</TableCell>
                  <TableCell>
                    {e.enrolledAt
                      ? new Date(e.enrolledAt).toLocaleString("th-TH")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <ChangeEnrollment id={e.courseId} />
                    <ConfirmDeleteButton label=""
                      title={` ยกเลิกการลงทะเบียนวิชา ${e.courseId}`}
                      description={`${courseOf(e.courseId)?.courseTitle}`}
                      onConfirm={() => hd(studentId as string, e.courseId)}></ConfirmDeleteButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div >
  );
}

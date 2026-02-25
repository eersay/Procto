/*
  Warnings:

  - A unique constraint covering the columns `[examId,studentId]` on the table `ExamSession` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ExamSession_examId_studentId_key" ON "ExamSession"("examId", "studentId");

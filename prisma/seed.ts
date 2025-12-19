import {
  AnnouncementAudience,
  AssignmentTarget,
  CurriculumMaterialType,
  HourStatus,
  PrismaClient,
  ProgramKey,
  Role,
  SubmissionStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Cambria Academy data...");

  // Programs
  await prisma.program.upsert({
    where: { key: ProgramKey.NAIL_TECH },
    update: {},
    create: {
      key: ProgramKey.NAIL_TECH,
      name: "Nail Technology",
      requiredHours: 300,
    },
  });
  await prisma.program.upsert({
    where: { key: ProgramKey.COSMETOLOGY },
    update: {},
    create: {
      key: ProgramKey.COSMETOLOGY,
      name: "Cosmetology",
      requiredHours: 1250,
    },
  });

  // Core accounts
  await prisma.user.upsert({
    where: { email: "admin@cambria.local" },
    update: { role: Role.ADMIN, name: "Avery Admin" },
    create: {
      email: "admin@cambria.local",
      name: "Avery Admin",
      role: Role.ADMIN,
      classGroup: "2025A",
    },
  });

  const head = await prisma.user.upsert({
    where: { email: "head@cambria.local" },
    update: { role: Role.HEAD_INSTRUCTOR, name: "Holland Head" },
    create: {
      email: "head@cambria.local",
      name: "Holland Head",
      role: Role.HEAD_INSTRUCTOR,
      classGroup: "2025A",
    },
  });

  const instructor = await prisma.user.upsert({
    where: { email: "instructor@cambria.local" },
    update: { role: Role.INSTRUCTOR, name: "Indie Instructor" },
    create: {
      email: "instructor@cambria.local",
      name: "Indie Instructor",
      role: Role.INSTRUCTOR,
      classGroup: "2025A",
    },
  });

  const studentOne = await prisma.user.upsert({
    where: { email: "student1@cambria.local" },
    update: { role: Role.STUDENT, name: "Skyler Student" },
    create: {
      email: "student1@cambria.local",
      name: "Skyler Student",
      role: Role.STUDENT,
      classGroup: "2025A",
    },
  });

  const studentTwo = await prisma.user.upsert({
    where: { email: "student2@cambria.local" },
    update: { role: Role.STUDENT, name: "Parker Student" },
    create: {
      email: "student2@cambria.local",
      name: "Parker Student",
      role: Role.STUDENT,
      classGroup: "2025B",
    },
  });

  // Hours
  await prisma.hourEntry.deleteMany({});
  await prisma.hourEntry.createMany({
    data: [
      {
        studentId: studentOne.id,
        minutes: 180,
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
        notes: "Clinic practice",
        status: HourStatus.APPROVED,
        programKey: ProgramKey.COSMETOLOGY,
        createdById: studentOne.id,
        reviewedById: instructor.id,
        reviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
      },
      {
        studentId: studentOne.id,
        minutes: 120,
        date: new Date(Date.now() - 1000 * 60 * 60 * 24),
        notes: "Night study session",
        status: HourStatus.PENDING,
        programKey: ProgramKey.COSMETOLOGY,
        createdById: studentOne.id,
      },
      {
        studentId: studentTwo.id,
        minutes: 90,
        date: new Date(),
        notes: "Lab make-up",
        status: HourStatus.REJECTED,
        programKey: ProgramKey.NAIL_TECH,
        createdById: instructor.id,
        reviewedById: instructor.id,
        reviewedAt: new Date(),
      },
    ],
  });

  // Assignments + submissions
  await prisma.assignmentSubmission.deleteMany({});
  await prisma.assignment.deleteMany({});
  const assignment = await prisma.assignment.create({
    data: {
      title: "Clinic Reflection",
      description: "Write a short reflection about last week's clinic rotation.",
      dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
      target: AssignmentTarget.CLASS_GROUP,
      targetIds: ["2025A"],
      attachments: [],
      createdById: instructor.id,
    },
  });

  await prisma.assignmentSubmission.create({
    data: {
      assignmentId: assignment.id,
      studentId: studentOne.id,
      textAnswer: "It went well! I focused on timing and sanitation best practices.",
      status: SubmissionStatus.GRADED,
      grade: "A-",
      feedback: "Great detail. Watch timing on color mixing.",
      reviewedById: instructor.id,
      reviewedAt: new Date(),
    },
  });

  await prisma.assignmentSubmission.create({
    data: {
      assignmentId: assignment.id,
      studentId: studentTwo.id,
      textAnswer: "Clinic helped me refine consultations.",
      status: SubmissionStatus.SUBMITTED,
    },
  });

  // Threads + messages
  await prisma.message.deleteMany({});
  await prisma.threadParticipant.deleteMany({});
  await prisma.thread.deleteMany({});

  const thread = await prisma.thread.create({
    data: {
      participants: {
        create: [
          { userId: studentOne.id },
          { userId: instructor.id },
        ],
      },
      messages: {
        create: [
          { senderId: studentOne.id, body: "Hi! Can we review last clinic's notes?" },
          { senderId: instructor.id, body: "Absolutely. Let's meet after lab today." },
        ],
      },
    },
  });

  await prisma.thread.update({
    where: { id: thread.id },
    data: { lastMessageAt: new Date() },
  });

  // Announcements
  await prisma.announcement.deleteMany({});
  await prisma.announcement.create({
    data: {
      title: "Clinic Schedule Update",
      body: "Friday clinic moved to Saturday 9am to accommodate guests.",
      audience: AnnouncementAudience.CLASS_GROUP,
      audienceClassGroups: ["2025A"],
      createdById: instructor.id,
    },
  });

  // Curriculum materials
  await prisma.curriculumMaterial.deleteMany({});
  await prisma.curriculumMaterial.createMany({
    data: [
      {
        title: "Sanitation Handbook",
        description: "Core reference PDF",
        materialType: CurriculumMaterialType.HANDOUT,
        fileRef: "/sample/sanitation.pdf",
        visibleToRoles: ["STUDENT", "INSTRUCTOR"],
        uploadedById: instructor.id,
      },
      {
        title: "Advanced Color Theory",
        description: "Slides for next module",
        materialType: CurriculumMaterialType.TEACHING_MATERIAL,
        fileRef: "/sample/color-theory.pdf",
        visibleToRoles: ["INSTRUCTOR"],
        uploadedById: head.id,
      },
    ],
  });

  // Portfolio items
  await prisma.portfolioItem.deleteMany({});
  await prisma.portfolioItem.createMany({
    data: [
      {
        studentId: studentOne.id,
        imageRef: "/sample/portfolio1.jpg",
        caption: "Cut + color practice",
        instructorFeedback: "Beautiful blending",
        feedbackById: instructor.id,
      },
      {
        studentId: studentOne.id,
        imageRef: "/sample/portfolio2.jpg",
        caption: "Updo rehearsal",
      },
    ],
  });

  // Head instructor tasks
  await prisma.instructorTask.deleteMany({});
  await prisma.instructorTask.createMany({
    data: [
      {
        title: "Shadow Clinic Block",
        description: "Observe Skyler during Saturday clinic.",
        status: "open",
        creatorId: head.id,
        assigneeId: instructor.id,
      },
      {
        title: "Prep Instructor Workshop",
        description: "Gather feedback for Monday meeting.",
        status: "in_progress",
        creatorId: head.id,
      },
    ],
  });

  console.log("✅ Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

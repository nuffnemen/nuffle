import { Prisma, NotificationType, AnnouncementAudience, AssignmentTarget, Role, Announcement, Assignment } from "@prisma/client";
import { prisma } from "./prisma";

type NotificationPayload = {
  userIds: string[];
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
  metadata?: Prisma.JsonValue | null;
};

export async function notifyUsers(payload: NotificationPayload) {
  const userIds = Array.from(new Set(payload.userIds.filter(Boolean)));
  if (!userIds.length) return;

  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type: payload.type,
      title: payload.title,
      body: payload.body ?? null,
      link: payload.link ?? null,
      metadata: payload.metadata ?? undefined,
    })),
  });
}

export async function getNotificationSummary(userId: string) {
  const [total, message] = await prisma.$transaction([
    prisma.notification.count({
      where: { userId, isRead: false },
    }),
    prisma.notification.count({
      where: { userId, isRead: false, type: NotificationType.MESSAGE },
    }),
  ]);

  return { total, message };
}

export async function getNotificationsForUser(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  const where: Prisma.NotificationWhereInput = {
    userId,
    isRead: false,
  };

  if (ids && ids.length) {
    where.id = { in: ids };
  }

  return prisma.notification.updateMany({
    where,
    data: { isRead: true },
  });
}

export async function markNotificationsForThread(userId: string, threadId: string) {
  return prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
      metadata: {
        path: ["threadId"],
        equals: threadId,
      },
    },
    data: { isRead: true },
  });
}

function resolveAnnouncementRecipients(announcement: Announcement) {
  const base: Prisma.UserWhereInput = {
    isActive: true,
  };

  switch (announcement.audience) {
    case AnnouncementAudience.ALL:
      return base;
    case AnnouncementAudience.CLASS_GROUP:
      if (announcement.audienceClassGroups.length) {
        return { ...base, classGroup: { in: announcement.audienceClassGroups } };
      }
      break;
    case AnnouncementAudience.ROLE:
      if (announcement.audienceRoles.length) {
        return { ...base, role: { in: announcement.audienceRoles as Role[] } };
      }
      break;
    case AnnouncementAudience.INDIVIDUAL:
      if (announcement.audienceIndividualIds.length) {
        return { ...base, id: { in: announcement.audienceIndividualIds } };
      }
      break;
  }

  return base;
}

export async function notifyAnnouncement(announcement: Announcement) {
  const recipients = await prisma.user.findMany({
    where: resolveAnnouncementRecipients(announcement),
    select: { id: true },
  });

  if (!recipients.length) return;

  await notifyUsers({
    userIds: recipients.map((r) => r.id),
    type: NotificationType.ANNOUNCEMENT,
    title: `announcement: ${announcement.title}`,
    body: announcement.body,
    link: "/student",
  });
}

function resolveAssignmentRecipients(assignment: Assignment) {
  const studentWhere: Prisma.UserWhereInput = {
    role: Role.STUDENT,
    isActive: true,
  };

  if (assignment.target === AssignmentTarget.CLASS_GROUP && assignment.targetIds.length) {
    studentWhere.classGroup = { in: assignment.targetIds };
  }

  if (assignment.target === AssignmentTarget.STUDENTS && assignment.targetIds.length) {
    studentWhere.id = { in: assignment.targetIds };
  }

  return studentWhere;
}

export async function notifyAssignmentPosted(assignment: Assignment) {
  const recipients = await prisma.user.findMany({
    where: resolveAssignmentRecipients(assignment),
    select: { id: true },
  });

  if (!recipients.length) return;

  const due = assignment.dueAt
    ? `due ${new Date(assignment.dueAt).toLocaleString()}`
    : "with no due date yet";

  await notifyUsers({
    userIds: recipients.map((r) => r.id),
    type: NotificationType.ASSIGNMENT_POSTED,
    title: `New assignment: ${assignment.title}`,
    body: `${assignment.description || "Details available inside"}. ${due}`,
    link: `/student/assignments/${assignment.id}`,
  });
}

export async function notifyAssignmentSubmitted(
  assignmentId: string,
  studentId: string,
  studentName: string,
  instructorId: string,
  assignmentTitle: string,
) {
  if (!instructorId) return;

  await notifyUsers({
    userIds: [instructorId],
    type: NotificationType.ASSIGNMENT_SUBMITTED,
    title: `Assignment submitted`,
    body: `${studentName} submitted ${assignmentTitle}`,
    link: `/instructor/assignments/${assignmentId}`,
    metadata: { assignmentId, studentId },
  });
}

export async function notifyMessageParticipants(
  threadId: string,
  senderId: string,
  senderName: string,
  recipientIds: string[],
  body: string,
) {
  const targets = recipientIds.filter((id) => id !== senderId);
  if (!targets.length) return;

  await notifyUsers({
    userIds: targets,
    type: NotificationType.MESSAGE,
    title: `New message from ${senderName}`,
    body: body.length > 240 ? `${body.slice(0, 240)}…` : body,
    metadata: { threadId },
  });
}

export async function notifyHoursLogged(studentName: string, minutes: number, entryId: string) {
  const recipients = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: [Role.INSTRUCTOR, Role.HEAD_INSTRUCTOR, Role.ADMIN] },
    },
    select: { id: true },
  });

  if (!recipients.length) return;

  await notifyUsers({
    userIds: recipients.map((r) => r.id),
    type: NotificationType.HOUR_LOGGED,
    title: `${studentName} logged ${minutes} minutes`,
    body: "Review the entry and approve or reject it.",
    link: "/instructor/hours",
    metadata: { entryId },
  });
}

export async function notifyHourStatusChange(
  studentId: string,
  reviewerName: string,
  status: "APPROVED" | "REJECTED",
  minutes: number,
) {
  const notificationType =
    status === "APPROVED" ? NotificationType.HOUR_APPROVED : NotificationType.HOUR_REJECTED;
  const title = `Hours ${status.toLowerCase()}`;
  await notifyUsers({
    userIds: [studentId],
    type: notificationType,
    title,
    body: `${reviewerName} ${status.toLowerCase()} ${minutes} minutes.`,
    link: "/student/hours",
  });
}

export async function markNotificationsForAssignment(assignmentId: string, studentId: string) {
  if (!studentId) return;

  return prisma.notification.updateMany({
    where: {
      isRead: false,
      type: NotificationType.ASSIGNMENT_SUBMITTED,
      AND: [
        {
          metadata: {
            path: ["assignmentId"],
            equals: assignmentId,
          },
        },
        {
          metadata: {
            path: ["studentId"],
            equals: studentId,
          },
        },
      ],
    },
    data: { isRead: true },
  });
}

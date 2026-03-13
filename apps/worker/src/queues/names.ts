export const queueNames = {
  email: "email",
  invitations: "invitations",
  audit: "audit",
  reports: "reports",
  cleanup: "cleanup",
} as const;

export type QueueName = (typeof queueNames)[keyof typeof queueNames];

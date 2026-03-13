export const queueNames = {
  email: "email",
  invitations: "invitations",
  audit: "audit",
  reports: "reports",
  cleanup: "cleanup",
  deadLetter: "dead-letter",
} as const;

export type QueueName = (typeof queueNames)[keyof typeof queueNames];

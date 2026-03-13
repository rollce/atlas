import { Role } from "@prisma/client";
import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(120),
});

export const createInvitationSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.nativeEnum(Role).refine((role) => role !== Role.OWNER, {
    message: "Invitations cannot grant OWNER role",
  }),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(24).max(256),
});

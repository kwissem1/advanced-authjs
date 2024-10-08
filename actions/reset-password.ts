'use server'

import { getPasswordResetTokenByToken } from '@/data/password-reset-token'
import { getUserByEmail } from '@/data/user'
import { db } from '@/lib/db'
import { ResetPasswordSchema } from '@/schemas'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

export const resetPassword = async (
  values: z.infer<typeof ResetPasswordSchema>,
  token: string | null
) => {
  if (!token) {
    return { error: 'Missing token!' }
  }

  const validatedFields = ResetPasswordSchema.safeParse(values)

  if (!validatedFields.success) {
    return { error: 'Invalid fields!' }
  }

  const { newPassword } = validatedFields.data

  const existingToken = await getPasswordResetTokenByToken(token)

  if (!existingToken) {
    return { error: 'Token is invalid!' }
  }

  const hasExpired = existingToken.expires < new Date()

  if (hasExpired) {
    return { error: 'Token has expired!' }
  }

  const existingUser = await getUserByEmail(existingToken.email)

  if (!existingUser) {
    return { error: 'Email does not exist!' }
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12)

  await db.user.update({
    where: {
      id: existingUser.id,
    },
    data: {
      password: hashedPassword,
    },
  })

  await db.passwordResetToken.delete({
    where: {
      id: existingToken.id,
    },
  })

  return { success: 'Password updated!' }
}

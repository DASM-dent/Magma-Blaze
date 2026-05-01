import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import { generateNumericCode, hashCode, sendMail } from '../email.js';
import { emailTemplates } from '../emailTemplates.js';

const router = Router();

const ADMIN_PERMISSIONS = [
  'dashboard','products','categories','orders','drops','models','content','shipping','users','finance','settings','security','support','roles'
];

const passwordSchema = z.string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .regex(/[A-Za-zÁÉÍÓÚáéíóúÑñ]/, 'La contraseña debe incluir al menos una letra.')
  .regex(/\d/, 'La contraseña debe incluir al menos un número.');

const credentials = z.object({
  email: z.string().email('Escribe un correo electrónico válido.'),
  password: passwordSchema
});

function formatValidationError(error: z.ZodError) {
  const flat = error.flatten();
  const first = Object.values(flat.fieldErrors).flat().find(Boolean) || flat.formErrors[0] || 'Revisa los datos e intenta nuevamente.';
  return { message: first, errors: flat.fieldErrors };
}

async function permissionsForRole(role: string) {
  if (role === 'ADMIN') return ADMIN_PERMISSIONS;
  const record = await prisma.role.findUnique({ where:{ slug:role }, include:{ permissions:true } }).catch(()=>null);
  return record?.active ? record.permissions.map(p=>p.permission) : [];
}

async function publicUser(user: { id:string; email:string; name:string; role:string; isVerified?: boolean; twoFactorEmailEnabled?: boolean }) {
  return { id:user.id, email:user.email, name:user.name, role:user.role, isVerified:user.isVerified, twoFactorEmailEnabled:user.twoFactorEmailEnabled, permissions: await permissionsForRole(user.role) };
}

function signToken(user: { id:string; email:string; role:string }) {
  return jwt.sign({ id:user.id, email:user.email, role:user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn as any });
}

function mailConfigured() {
  return Boolean(config.smtpHost && config.smtpUser && config.smtpPass);
}

async function createCode(input: { userId?: string; email: string; purpose: 'EMAIL_VERIFY' | 'LOGIN_2FA'; minutes?: number }) {
  const code = generateNumericCode(6);
  const codeHash = await hashCode(code);
  const record = await prisma.emailVerificationCode.create({
    data: {
      userId: input.userId,
      email: input.email.toLowerCase(),
      purpose: input.purpose,
      codeHash,
      expiresAt: new Date(Date.now() + 1000 * 60 * (input.minutes ?? 10))
    }
  });
  return { code, record };
}

async function sendVerificationEmail(email: string, code: string) {
  await sendMail({ to: email, ...emailTemplates.verificationCode({ code }) });
}

async function sendLoginCodeEmail(email: string, code: string) {
  await sendMail({ to: email, ...emailTemplates.loginCode({ code }) });
}

router.post('/register', async (req, res) => {
  const body = credentials.extend({ name: z.string().min(2, 'Escribe tu nombre o un nombre visible de al menos 2 caracteres.'), enableEmailCodeLogin: z.boolean().optional() }).safeParse(req.body);
  if (!body.success) return res.status(400).json(formatValidationError(body.error));
  const email = body.data.email.toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email }});
  if (exists) return res.status(409).json({ message:'Este correo ya existe' });
  const passwordHash = await bcrypt.hash(body.data.password, 12);
  const canSendMail = mailConfigured();
  const user = await prisma.user.create({ data: { email, name: body.data.name, passwordHash, isVerified: !canSendMail, twoFactorEmailEnabled: canSendMail && Boolean(body.data.enableEmailCodeLogin) }});
  if (canSendMail) {
    const { code } = await createCode({ userId: user.id, email, purpose:'EMAIL_VERIFY' });
    await sendVerificationEmail(email, code);
    await prisma.auditLog.create({ data: { userId: user.id, action:'USER_REGISTERED_VERIFICATION_SENT', ip:req.ip }});
    return res.status(201).json({ message:'Cuenta creada. Revisa tu correo para verificarla.', requiresEmailVerification:true, email:user.email });
  }
  await prisma.auditLog.create({ data: { userId: user.id, action:'USER_REGISTERED_LOCAL_VERIFIED', ip:req.ip }});
  res.status(201).json({ message:'Cuenta creada. Ya puedes iniciar sesión.', requiresEmailVerification:false, email:user.email });
});

router.post('/resend-verification', async (req, res) => {
  const body = z.object({ email:z.string().email() }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ message:'Correo inválido' });
  if (!mailConfigured()) return res.json({ message:'Si la cuenta requiere verificación, enviaremos un código.' });
  const email = body.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where:{ email }});
  if (!user) return res.json({ message:'Si el correo existe, enviaremos un código.' });
  if (user.isVerified) return res.json({ message:'La cuenta ya está verificada.' });
  const { code } = await createCode({ userId:user.id, email, purpose:'EMAIL_VERIFY' });
  await sendVerificationEmail(email, code);
  await prisma.auditLog.create({ data:{ userId:user.id, action:'EMAIL_VERIFICATION_RESENT', ip:req.ip }});
  res.json({ message:'Código enviado si el correo existe.' });
});

router.post('/verify-email', async (req, res) => {
  const body = z.object({ email:z.string().email('Escribe un correo electrónico válido.'), code:z.string().regex(/^\d{6}$/, 'El código debe tener 6 dígitos.') }).safeParse(req.body);
  if (!body.success) return res.status(400).json(formatValidationError(body.error));
  const email = body.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where:{ email }});
  if (!user) return res.status(400).json({ message:'Código inválido o expirado' });
  const record = await prisma.emailVerificationCode.findFirst({
    where:{ email, purpose:'EMAIL_VERIFY', usedAt:null, expiresAt:{ gt:new Date() }},
    orderBy:{ createdAt:'desc' }
  });
  if (!record || record.attempts >= 5) return res.status(400).json({ message:'Código inválido o expirado' });
  const incomingHash = await hashCode(body.data.code);
  if (incomingHash !== record.codeHash) {
    await prisma.emailVerificationCode.update({ where:{ id:record.id }, data:{ attempts:{ increment:1 } }});
    return res.status(400).json({ message:'Código inválido o expirado' });
  }
  await prisma.$transaction([
    prisma.emailVerificationCode.update({ where:{ id:record.id }, data:{ usedAt:new Date() }}),
    prisma.user.update({ where:{ id:user.id }, data:{ isVerified:true }}),
    prisma.auditLog.create({ data:{ userId:user.id, action:'EMAIL_VERIFIED', ip:req.ip }})
  ]);
  res.json({ message:'Correo verificado correctamente.' });
});

router.post('/login', async (req, res) => {
  const body = credentials.safeParse(req.body);
  if (!body.success) return res.status(400).json(formatValidationError(body.error));
  const email = body.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email }});
  if (!user) return res.status(401).json({ message:'Credenciales incorrectas' });
  if ((user as any).blocked) return res.status(403).json({ message:(user as any).blockedReason || 'Tu cuenta ha sido bloqueada. Contacta soporte.' });
  if ((user as any).lockedUntil && (user as any).lockedUntil > new Date()) {
    if (!mailConfigured()) return res.status(423).json({ message:'No pudimos iniciar sesión. Intenta más tarde o contacta soporte.' });
    const { code } = await createCode({ userId:user.id, email:user.email, purpose:'LOGIN_2FA' });
    await sendLoginCodeEmail(user.email, code);
    return res.status(423).json({ message:'No pudimos iniciar sesión. Revisa tu correo o contacta soporte.', requiresUnlock:true, email:user.email });
  }
  const valid = await bcrypt.compare(body.data.password, user.passwordHash);
  if (!valid) {
    const attempts = ((user as any).failedLoginAttempts || 0) + 1;
    const lock = attempts >= 3 && mailConfigured();
    await prisma.user.update({ where:{ id:user.id }, data:{ failedLoginAttempts:attempts, ...(lock ? { lockedUntil:new Date(Date.now()+15*60*1000) } : {}) } as any });
    if (lock) {
      const { code } = await createCode({ userId:user.id, email:user.email, purpose:'LOGIN_2FA' });
      await sendLoginCodeEmail(user.email, code);
      return res.status(423).json({ message:'No pudimos iniciar sesión. Revisa tu correo o contacta soporte.', requiresUnlock:true, email:user.email });
    }
    return res.status(401).json({ message:'Credenciales incorrectas.' });
  }
  if (!user.isVerified) {
    if (!mailConfigured()) {
      const verifiedUser = await prisma.user.update({ where:{ id:user.id }, data:{ isVerified:true, failedLoginAttempts:0, lockedUntil:null } as any });
      const token = signToken(verifiedUser);
      await prisma.auditLog.create({ data: { userId: verifiedUser.id, action:'USER_LOGIN_LOCAL_VERIFIED', ip:req.ip }});
      return res.json({ token, user: await publicUser(verifiedUser) });
    }
    const { code } = await createCode({ userId:user.id, email:user.email, purpose:'EMAIL_VERIFY' });
    await sendVerificationEmail(user.email, code);
    return res.status(403).json({ message:'Debes verificar tu correo. Te enviamos un código nuevo.', requiresEmailVerification:true, email:user.email });
  }

  const needs2fa = mailConfigured() && (user.twoFactorEmailEnabled || (user.role === 'ADMIN' && config.requireAdminEmail2FA));
  if (needs2fa) {
    const { code, record } = await createCode({ userId:user.id, email:user.email, purpose:'LOGIN_2FA' });
    await sendLoginCodeEmail(user.email, code);
    await prisma.auditLog.create({ data:{ userId:user.id, action:'LOGIN_CODE_SENT', ip:req.ip }});
    return res.json({ requiresCode:true, challengeId:record.id, message:'Código enviado a tu correo.' });
  }

  await prisma.user.update({ where:{ id:user.id }, data:{ failedLoginAttempts:0, lockedUntil:null } as any });
  const token = signToken(user);
  await prisma.auditLog.create({ data: { userId: user.id, action:'USER_LOGIN', ip:req.ip }});
  res.json({ token, user: await publicUser(user) });
});

router.post('/unlock-account', async (req, res) => {
  const body = z.object({ email:z.string().email('Escribe un correo electrónico válido.'), code:z.string().regex(/^\d{6}$/, 'El código debe tener 6 dígitos.'), password:passwordSchema, confirmPassword:passwordSchema }).safeParse(req.body);
  if (!body.success) return res.status(400).json(formatValidationError(body.error));
  if (body.data.password !== body.data.confirmPassword) return res.status(400).json({ message:'Las contraseñas no coinciden' });
  const email=body.data.email.toLowerCase();
  const user=await prisma.user.findUnique({ where:{ email }});
  if (!user) return res.status(400).json({ message:'Código inválido o expirado' });
  const record=await prisma.emailVerificationCode.findFirst({ where:{ email, purpose:'LOGIN_2FA', usedAt:null, expiresAt:{ gt:new Date() }}, orderBy:{createdAt:'desc'} });
  if (!record || record.attempts >= 5) return res.status(400).json({ message:'Código inválido o expirado' });
  if (await hashCode(body.data.code) !== record.codeHash) {
    await prisma.emailVerificationCode.update({ where:{ id:record.id }, data:{ attempts:{ increment:1 } }});
    return res.status(400).json({ message:'Código inválido o expirado' });
  }
  const passwordHash=await bcrypt.hash(body.data.password,12);
  await prisma.$transaction([
    prisma.emailVerificationCode.update({ where:{id:record.id}, data:{ usedAt:new Date() }}),
    prisma.user.update({ where:{id:user.id}, data:{ passwordHash, failedLoginAttempts:0, lockedUntil:null } as any }),
    prisma.auditLog.create({ data:{ userId:user.id, action:'ACCOUNT_UNLOCKED_PASSWORD_RESET', ip:req.ip }})
  ]);
  res.json({ message:'Cuenta desbloqueada. Ya puedes iniciar sesión con tu nueva contraseña.' });
});

router.post('/verify-login-code', async (req, res) => {
  const body = z.object({ challengeId:z.string().min(8, 'Sesión de verificación inválida.'), code:z.string().regex(/^\d{6}$/, 'El código debe tener 6 dígitos.') }).safeParse(req.body);
  if (!body.success) return res.status(400).json(formatValidationError(body.error));
  const record = await prisma.emailVerificationCode.findUnique({ where:{ id:body.data.challengeId }, include:{ user:true }});
  if (!record || !record.user || record.purpose !== 'LOGIN_2FA' || record.usedAt || record.expiresAt < new Date() || record.attempts >= 5) {
    return res.status(400).json({ message:'Código inválido o expirado' });
  }
  const incomingHash = await hashCode(body.data.code);
  if (incomingHash !== record.codeHash) {
    await prisma.emailVerificationCode.update({ where:{ id:record.id }, data:{ attempts:{ increment:1 } }});
    return res.status(400).json({ message:'Código inválido o expirado' });
  }
  await prisma.emailVerificationCode.update({ where:{ id:record.id }, data:{ usedAt:new Date() }});
  await prisma.user.update({ where:{ id:record.user.id }, data:{ failedLoginAttempts:0, lockedUntil:null } as any });
  const token = signToken(record.user);
  await prisma.auditLog.create({ data:{ userId:record.user.id, action:'USER_LOGIN_2FA_SUCCESS', ip:req.ip }});
  res.json({ token, user: await publicUser(record.user) });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id:req.user!.id }, select: { id:true, email:true, name:true, role:true, isVerified:true, twoFactorEmailEnabled:true, blocked:true }});
  if (!user) return res.status(404).json({ message:'Usuario no encontrado' });
  res.json({ ...user, permissions: await permissionsForRole(user.role) });
});

router.post('/preferences', requireAuth, async (req, res) => {
  const body = z.object({ twoFactorEmailEnabled: z.boolean() }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ message:'Preferencias inválidas' });
  if (body.data.twoFactorEmailEnabled && !mailConfigured()) return res.status(400).json({ message:'Configura el correo antes de activar códigos por email.' });
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { twoFactorEmailEnabled: body.data.twoFactorEmailEnabled },
    select: { id:true, email:true, name:true, role:true, isVerified:true, twoFactorEmailEnabled:true }
  });
  await prisma.auditLog.create({ data:{ userId:user.id, action: user.twoFactorEmailEnabled ? 'SECURITY_PREF_2FA_ON' : 'SECURITY_PREF_2FA_OFF', ip:req.ip }});
  res.json(await publicUser(user));
});

export default router;

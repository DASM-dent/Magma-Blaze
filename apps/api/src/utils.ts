import { Response } from 'express';
export function ok(res: Response, data: unknown = {}) { return res.json({ ok: true, data }); }
export function fail(res: Response, status: number, message: string) { return res.status(status).json({ ok: false, message }); }
export function toCentsLikeDOP(value: number) { return Math.round(value); }

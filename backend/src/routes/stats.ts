import { Hono } from 'hono'
import { getStats } from '../db'

export const stats = new Hono().get('/', (c) => c.json(getStats()))

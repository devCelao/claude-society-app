import * as mariadb from 'mariadb'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@/generated/prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient
  pool: mariadb.Pool
}

function getPool(): mariadb.Pool {
  if (!globalForPrisma.pool) {
    const raw = process.env.DATABASE_URL
    if (!raw) throw new Error('DATABASE_URL não definida')
    const u = new URL(raw.replace(/^mysql:\/\//, 'http://'))
    // TODO: remover quando rodar via Docker localmente — "db" só resolve dentro da rede Docker
    // Usar 127.0.0.1 em vez de "localhost" para forçar IPv4 (Next.js pode resolver localhost como ::1)
    const rawHost = (process.env.NODE_ENV === 'development' && u.hostname === 'db')
      ? 'localhost'
      : u.hostname
    const host = rawHost === 'localhost' ? '127.0.0.1' : rawHost
    globalForPrisma.pool = mariadb.createPool({
      host,
      port: u.port ? parseInt(u.port) : 3306,
      user: u.username,
      password: u.password,
      database: u.pathname.replace(/^\//, ''),
    })
  }
  return globalForPrisma.pool
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaMariaDb(getPool())
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

-- =============================================================
-- Script de Limpieza de Base de Datos para Producción
-- Personal VIP - GymCore
-- Fecha: 2026-03-28
-- 
-- IMPORTANTE: Este script ELIMINA todos los datos transaccionales
-- y de clientes, pero CONSERVA:
--   ✅ Usuarios del sistema (para login)
--   ✅ Planes de membresía (catálogo)
--   ✅ Productos (catálogo)
-- 
-- ELIMINA:
--   ❌ Registros de asistencia
--   ❌ Pagos
--   ❌ Ventas y sale_items
--   ❌ Membresías asignadas
--   ❌ Clientes
--   ❌ Progreso físico
--   ❌ Trainer-Client assignments
--   ❌ Cash registers
--   ❌ Audit logs
-- =============================================================

-- Desactivar triggers de FK temporalmente para facilitar borrado
-- (En PostgreSQL se usa CASCADE o se borra en orden correcto)

BEGIN;

-- 1. Eliminar registros de auditoría
DELETE FROM audit_logs;

-- 2. Eliminar registros de asistencia
DELETE FROM attendances;

-- 3. Eliminar pagos (unificados)
DELETE FROM payments;

-- 4. Eliminar items de venta
DELETE FROM sale_items;

-- 5. Eliminar ventas
DELETE FROM sales;

-- 6. Eliminar caja registradora
DELETE FROM cash_registers;

-- 7. Eliminar progreso físico
DELETE FROM physical_progress;

-- 8. Eliminar asignaciones trainer-client
DELETE FROM trainer_clients;

-- 9. Eliminar membresías asignadas a clientes
DELETE FROM memberships;

-- 10. Eliminar clientes
DELETE FROM clients;

-- 11. Eliminar entrenadores (trainers) - son registros asociados a users
DELETE FROM trainers;

-- Verificación: Mostrar qué queda
SELECT 'Usuarios del sistema' as tipo, COUNT(*) as cantidad FROM users
UNION ALL
SELECT 'Planes de Membresía', COUNT(*) FROM membership_plans
UNION ALL
SELECT 'Productos', COUNT(*) FROM products
UNION ALL
SELECT 'Clientes', COUNT(*) FROM clients
UNION ALL
SELECT 'Membresías', COUNT(*) FROM memberships
UNION ALL
SELECT 'Asistencias', COUNT(*) FROM attendances
UNION ALL
SELECT 'Pagos', COUNT(*) FROM payments
UNION ALL
SELECT 'Ventas', COUNT(*) FROM sales;

COMMIT;

-- Nota: Los assets (activos fijos) NO se eliminan ya que son 
-- inventario del gimnasio, no datos transaccionales.

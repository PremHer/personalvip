import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // ===== Create Admin User =====
    const adminPassword = await bcrypt.hash('admin123', 12);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@gymcore.com' },
        update: {},
        create: {
            email: 'admin@gymcore.com',
            passwordHash: adminPassword,
            name: 'Administrador',
            role: 'ADMIN',
            phone: '0999999999',
        },
    });
    console.log('✅ Admin created:', admin.email);

    // ===== Create Owner =====
    const ownerPassword = await bcrypt.hash('owner123', 12);
    const owner = await prisma.user.upsert({
        where: { email: 'dueno@gymcore.com' },
        update: {},
        create: {
            email: 'dueno@gymcore.com',
            passwordHash: ownerPassword,
            name: 'Carlos Mendoza (Dueño)',
            role: 'OWNER',
            phone: '0988888888',
        },
    });
    console.log('✅ Owner created:', owner.email);

    // ===== Create Receptionist =====
    const receptionistPassword = await bcrypt.hash('recep123', 12);
    const receptionist = await prisma.user.upsert({
        where: { email: 'recepcion@gymcore.com' },
        update: {},
        create: {
            email: 'recepcion@gymcore.com',
            passwordHash: receptionistPassword,
            name: 'María López',
            role: 'RECEPTIONIST',
            phone: '0977777777',
        },
    });
    console.log('✅ Receptionist created:', receptionist.email);

    // ===== Create Trainer =====
    const trainerPassword = await bcrypt.hash('trainer123', 12);
    const trainerUser = await prisma.user.upsert({
        where: { email: 'entrenador@gymcore.com' },
        update: {},
        create: {
            email: 'entrenador@gymcore.com',
            passwordHash: trainerPassword,
            name: 'Pedro Martínez',
            role: 'TRAINER',
            phone: '0966666666',
        },
    });

    const trainer = await prisma.trainer.upsert({
        where: { userId: trainerUser.id },
        update: {},
        create: {
            userId: trainerUser.id,
            specialties: 'Musculación, CrossFit, Funcional',
            schedule: {
                monday: { start: '06:00', end: '14:00' },
                tuesday: { start: '06:00', end: '14:00' },
                wednesday: { start: '06:00', end: '14:00' },
                thursday: { start: '06:00', end: '14:00' },
                friday: { start: '06:00', end: '14:00' },
                saturday: { start: '08:00', end: '12:00' },
            },
        },
    });
    console.log('✅ Trainer created:', trainerUser.email);

    // ===== Membership Plans (Precios reales en Soles S/) =====
    const plans = [
        { name: 'Mensual Individual', price: 100.00, durationDays: 30, description: 'Acceso ilimitado por 1 mes - 1 persona' },
        { name: 'Mensual Dúo', price: 90.00, durationDays: 30, description: 'S/180 por 2 personas (S/90 c/u). Válido mientras ambos mantengan membresía activa' },
        { name: 'Mensual Trío', price: 80.00, durationDays: 30, description: 'S/240 por 3 personas (S/80 c/u). Válido mientras los 3 mantengan membresía activa' },
        { name: 'Trimestral (3 meses)', price: 250.00, durationDays: 90, description: 'Acceso ilimitado por 3 meses - Ahorro de S/50' },
        { name: 'Semestral (6 meses)', price: 450.00, durationDays: 180, description: 'Acceso ilimitado por 6 meses - Ahorro de S/150' },
        { name: '9 Meses', price: 650.00, durationDays: 270, description: 'Acceso ilimitado por 9 meses - Ahorro de S/250' },
        { name: 'Anual (12 meses)', price: 900.00, durationDays: 365, description: 'Acceso ilimitado por 12 meses - Ahorro de S/300' },
        { name: 'Rutina Personalizada', price: 8.00, durationDays: 30, description: 'Plan de rutina personalizada elaborada por entrenador' },
    ];

    for (const plan of plans) {
        await prisma.membershipPlan.upsert({
            where: { id: plan.name }, // Will fail, use create
            update: {},
            create: plan,
        }).catch(() =>
            prisma.membershipPlan.create({ data: plan }),
        );
    }
    console.log('✅ Membership plans created');

    // ===== Sample Clients =====
    const clients = [
        { name: 'Juan García', email: 'juan@email.com', phone: '0991111111', qrCode: 'GYM-JUAN0001' },
        { name: 'Ana Torres', email: 'ana@email.com', phone: '0992222222', qrCode: 'GYM-ANA00002' },
        { name: 'Luis Ramírez', email: 'luis@email.com', phone: '0993333333', qrCode: 'GYM-LUIS0003' },
        { name: 'Sofia Herrera', email: 'sofia@email.com', phone: '0994444444', qrCode: 'GYM-SOFI0004' },
        { name: 'Diego Castro', email: 'diego@email.com', phone: '0995555555', qrCode: 'GYM-DIEG0005' },
    ];

    const createdClients = [];
    for (const client of clients) {
        const c = await prisma.client.upsert({
            where: { qrCode: client.qrCode },
            update: {},
            create: client,
        });
        createdClients.push(c);
    }
    console.log('✅ Sample clients created');

    // ===== Assign Memberships =====
    const allPlans = await prisma.membershipPlan.findMany();
    const monthlyPlan = allPlans.find((p) => p.name === 'Mensual Individual');

    if (monthlyPlan) {
        for (const client of createdClients) {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + monthlyPlan.durationDays);

            await prisma.membership.create({
                data: {
                    clientId: client.id,
                    planId: monthlyPlan.id,
                    startDate,
                    endDate,
                    amountPaid: Number(monthlyPlan.price),
                    createdBy: admin.id,
                    status: 'ACTIVE',
                },
            }).catch(() => { }); // Ignore if exists
        }
        console.log('✅ Memberships assigned');
    }

    // ===== Products =====
    const products = [
        { name: 'Proteína Whey 2lb', barcode: 'PROD001', price: 35.00, stock: 15, category: 'Suplementos' },
        { name: 'Creatina 300g', barcode: 'PROD002', price: 18.00, stock: 20, category: 'Suplementos' },
        { name: 'BCAA 30 servings', barcode: 'PROD003', price: 22.00, stock: 10, category: 'Suplementos' },
        { name: 'Agua Mineral 500ml', barcode: 'PROD004', price: 1.00, stock: 50, category: 'Bebidas' },
        { name: 'Bebida Energética', barcode: 'PROD005', price: 2.50, stock: 30, category: 'Bebidas' },
        { name: 'Barra de Proteína', barcode: 'PROD006', price: 3.00, stock: 25, category: 'Snacks' },
        { name: 'Guantes de Gym', barcode: 'PROD007', price: 12.00, stock: 8, category: 'Accesorios' },
        { name: 'Shaker Bottle', barcode: 'PROD008', price: 8.00, stock: 12, category: 'Accesorios' },
    ];

    for (const product of products) {
        await prisma.product.upsert({
            where: { barcode: product.barcode },
            update: {},
            create: product,
        });
    }
    console.log('✅ Products created');

    // ===== Assets =====
    const assets = [
        { name: 'Caminadora TechnoGym', serialNumber: 'TG-001', purchasePrice: 3500.00, status: 'ACTIVE' as const },
        { name: 'Bicicleta Estática', serialNumber: 'BE-001', purchasePrice: 1200.00, status: 'ACTIVE' as const },
        { name: 'Multiestación Smith', serialNumber: 'SM-001', purchasePrice: 4500.00, status: 'ACTIVE' as const },
        { name: 'Rack de Pesas', serialNumber: 'RP-001', purchasePrice: 2000.00, status: 'ACTIVE' as const },
        { name: 'Banco Ajustable', serialNumber: 'BA-001', purchasePrice: 800.00, status: 'ACTIVE' as const },
        { name: 'Máquina de Poleas', serialNumber: 'MP-001', purchasePrice: 3000.00, status: 'MAINTENANCE' as const },
    ];

    for (const asset of assets) {
        await prisma.asset.create({ data: asset }).catch(() => { });
    }
    console.log('✅ Assets created');

    console.log('\n🎉 Seed completed!');
    console.log('\n📋 Login credentials:');
    console.log('  Admin:       admin@gymcore.com / admin123');
    console.log('  Dueño:       dueno@gymcore.com / owner123');
    console.log('  Recepción:   recepcion@gymcore.com / recep123');
    console.log('  Entrenador:  entrenador@gymcore.com / trainer123');
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

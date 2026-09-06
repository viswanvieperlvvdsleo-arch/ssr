import { prisma } from '../prisma';
import { initialsFor, colorFor } from '../defaults';
import { notifyUsers } from '../notify';
import { decryptCredential } from './credentials';

export async function fulfillServerPayment(payment) {
  const existingBooking = await prisma.appServerBooking.findFirst({
    where: { razorpayOrderId: payment.razorpayOrderId },
    select: { id: true, chatId: true },
  });
  if (existingBooking) {
    const availableCount = await prisma.appServerCredential.count({ where: { courseId: payment.courseId, status: 'available' } });
    return { bookingId: existingBooking.id, chatId: existingBooking.chatId, availableCount };
  }

  let booking = null;
  let message = null;
  let credentialAssigned = false;
  try {
    const assignment = await prisma.appServerCredential.updateMany({
      where: {
        id: payment.credentialId,
        courseId: payment.courseId,
        status: 'reserved',
        reservationId: payment.reservationId,
        assignedTo: payment.userId,
      },
      data: { status: 'assigned', assignedAt: new Date(), reservationId: null, reservedUntil: null },
    });
    if (assignment.count !== 1) throw new Error('The reserved server credential is no longer available');
    credentialAssigned = true;

    const [course, credential, admin] = await Promise.all([
      prisma.appCourse.findUnique({ where: { id: payment.courseId }, select: { id: true, title: true } }),
      prisma.appServerCredential.findUnique({ where: { id: payment.credentialId }, select: { credential: true } }),
      prisma.appUser.findFirst({ where: { role: { in: ['Admin', 'Super Admin'] } }, select: { id: true, name: true, initials: true, color: true } }),
    ]);
    if (!course || !credential) throw new Error('Server service or credential was not found');
    if (!admin) throw new Error('No administrator is available for credential delivery');

    booking = await prisma.appServerBooking.create({
      data: {
        courseId: payment.courseId,
        credentialId: payment.credentialId,
        userId: payment.userId,
        months: payment.months,
        originalPrice: payment.originalPrice,
        discountPrice: payment.discountPrice,
        discountPercent: payment.discountPercent,
        paymentStatus: 'paid',
        razorpayOrderId: payment.razorpayOrderId,
        razorpayPaymentId: payment.razorpayPaymentId,
      },
    });

    const participantIds = [payment.userId, admin.id].sort();
    let chat = await prisma.appChat.findFirst({ where: { type: 'direct', participants: { hasEvery: participantIds } } });
    if (!chat) {
      chat = await prisma.appChat.create({ data: { type: 'direct', participants: participantIds, createdBy: admin.id, privateChatEnabled: true } });
    }
    const adminName = admin.name || 'Admin Assistant';
    message = await prisma.appMessage.create({
      data: {
        chatId: chat.id,
        senderId: admin.id,
        senderName: adminName,
        senderInitials: admin.initials || initialsFor(adminName),
        senderColor: admin.color || colorFor(admin.id),
        content: `Payment confirmed for ${course.title}.\n\nDuration: ${payment.months} month${payment.months === 1 ? '' : 's'}\n\nServer login:\n${decryptCredential(credential.credential)}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSystem: true,
      },
    });
    await prisma.appServerBooking.update({ where: { id: booking.id }, data: { chatId: chat.id } });

    const availableCount = await prisma.appServerCredential.count({ where: { courseId: payment.courseId, status: 'available' } });
    await prisma.appCourse.update({ where: { id: payment.courseId }, data: { credentialCount: availableCount } });
    await notifyUsers([payment.userId], {
      title: 'Server payment confirmed',
      body: `${course.title} login details are ready in your admin chat.`,
      url: `/ssr-app/home?section=chat&chatId=${encodeURIComponent(chat.id)}`,
      data: { type: 'server-access', chatId: chat.id, bookingId: booking.id },
    });
    return { bookingId: booking.id, chatId: chat.id, availableCount };
  } catch (error) {
    if (message?.id) await prisma.appMessage.delete({ where: { id: message.id } }).catch(() => null);
    if (booking?.id) await prisma.appServerBooking.delete({ where: { id: booking.id } }).catch(() => null);
    if (credentialAssigned) {
      await prisma.appServerCredential.updateMany({
        where: { id: payment.credentialId, status: 'assigned', assignedTo: payment.userId },
        data: {
          status: 'reserved',
          assignedAt: null,
          reservationId: payment.reservationId,
          reservedUntil: new Date(Date.now() + 15 * 60 * 1000),
        },
      }).catch(() => null);
    }
    throw error;
  }
}

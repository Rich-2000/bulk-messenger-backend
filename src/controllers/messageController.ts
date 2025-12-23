import { Request, Response } from 'express';
import Message, { MessageType, MessageStatus } from '../models/Message';
import Contact from '../models/Contact';
import { MaddyCMSService } from '../services/MaddyCMSService';
import { AppError } from '../middleware/errorHandler';

const maddyService = new MaddyCMSService();

interface Recipient {
  name: string;
  phoneNumber?: string;
  email?: string;
}

interface RecipientWithStatus extends Recipient {
  status: MessageStatus;
  messageId?: string;
  error?: string;
}

export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    // @ts-ignore - user is attached by auth middleware
    const userId = req.user._id;
    const { type, content, subject, recipientIds, directRecipients, schedule } = req.body;

    console.log('Sending message:', { userId, type, recipientIds, directRecipients });

    // Validate required fields
    if (!type || !content || (!recipientIds?.length && !directRecipients?.length)) {
      throw new AppError('Missing required fields', 400);
    }

    // Get recipients from contact IDs or direct input
    let recipients: Recipient[] = [];
    
    if (recipientIds?.length) {
      const contacts = await Contact.find({
        _id: { $in: recipientIds },
        userId
      });
      
      console.log('Found contacts:', contacts.length);
      
      recipients = contacts.map(contact => ({
        name: contact.name,
        phoneNumber: contact.phoneNumber,
        email: contact.email
      }));
    }

    if (directRecipients?.length) {
      recipients.push(...directRecipients.map((recipient: any) => ({
        name: recipient.name || 'Direct Recipient',
        phoneNumber: recipient.phoneNumber,
        email: recipient.email
      })));
    }

    console.log('Total recipients:', recipients.length);

    // Filter valid recipients based on message type
    const validRecipients: Recipient[] = recipients.filter(recipient => {
      if (type === MessageType.SMS) return recipient.phoneNumber;
      if (type === MessageType.EMAIL) return recipient.email;
      return false;
    });

    console.log('Valid recipients:', validRecipients.length);

    if (validRecipients.length === 0) {
      throw new AppError('No valid recipients found', 400);
    }

    // Create message record
    const message = new Message({
      userId,
      type,
      content,
      subject,
      recipients: validRecipients.map(recipient => ({
        ...recipient,
        status: MessageStatus.PENDING
      })),
      totalRecipients: validRecipients.length,
      status: MessageStatus.PENDING,
      successfulSends: 0,
      failedSends: 0,
      cost: 0,
      scheduledFor: schedule ? new Date(schedule) : undefined
    });

    await message.save();

    console.log('Message created:', message._id);

    // If immediate send, process now
    if (!schedule || new Date(schedule) <= new Date()) {
      await processMessageSending(message);
    }

    // Fetch the updated message
    const updatedMessage = await Message.findById(message._id);

    console.log('Message sent successfully:', updatedMessage);

    res.json({
      success: true,
      message: 'Message queued successfully',
      data: updatedMessage
    });
  } catch (error: any) {
    console.error('Send message error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message
    });
  }
};

async function processMessageSending(message: any): Promise<void> {
  try {
    console.log('Processing message:', message._id, message.type);

    if (message.type === MessageType.SMS) {
      await processBulkSMS(message);
    } else if (message.type === MessageType.EMAIL) {
      await processBulkEmail(message);
    }

    message.status = MessageStatus.SENT;
    message.sentAt = new Date();
    await message.save();

    console.log('Message processed successfully');
  } catch (error) {
    console.error('Process message error:', error);
    message.status = MessageStatus.FAILED;
    await message.save();
  }
}

async function processBulkSMS(message: any): Promise<void> {
  const phoneNumbers = message.recipients
    .filter((r: RecipientWithStatus) => r.phoneNumber)
    .map((r: RecipientWithStatus) => r.phoneNumber!);

  console.log('Sending bulk SMS to:', phoneNumbers.length, 'numbers');
  console.log('Phone numbers:', phoneNumbers);

  try {
    // Use the corrected API call
    const result = await maddyService.sendBulkSMS(
      phoneNumbers,
      message.content,
      'BulkMsgApp' // Sender ID
    );

    console.log('SMS result:', result);

    // Check if the send was successful
    if (result.success || result.message_id) {
      // Mark all recipients as sent
      message.recipients.forEach((recipient: RecipientWithStatus) => {
        if (recipient.phoneNumber) {
          recipient.status = MessageStatus.SENT;
          recipient.messageId = result.message_id;
          message.successfulSends++;
        }
      });

      // Calculate cost (adjust based on your pricing)
      message.cost = phoneNumbers.length * 0.01;
    } else {
      throw new Error('SMS send returned unsuccessful status');
    }
  } catch (error: any) {
    console.error('Bulk SMS error:', error);
    
    // Mark all as failed
    message.recipients.forEach((recipient: RecipientWithStatus) => {
      if (recipient.phoneNumber) {
        recipient.status = MessageStatus.FAILED;
        recipient.error = error.message || 'Service error';
        message.failedSends++;
      }
    });
  }
}

async function processBulkEmail(message: any): Promise<void> {
  const emailRecipients = message.recipients
    .filter((r: RecipientWithStatus) => r.email)
    .map((r: RecipientWithStatus) => ({
      email: r.email!,
      name: r.name || 'Recipient'
    }));

  console.log('Sending bulk email to:', emailRecipients.length, 'addresses');

  try {
    const result = await maddyService.sendBulkEmail({
      recipients: emailRecipients,
      subject: message.subject || 'No Subject',
      html: message.content,
      text: message.content.replace(/<[^>]*>/g, '')
    });

    console.log('Email result:', result);

    // Check if the send was successful
    if (result.success || result.batch_id) {
      // Mark all recipients as sent
      message.recipients.forEach((recipient: RecipientWithStatus) => {
        if (recipient.email) {
          recipient.status = MessageStatus.SENT;
          recipient.messageId = result.batch_id || result.message_id;
          message.successfulSends++;
        }
      });

      // Calculate cost
      message.cost = emailRecipients.length * 0.001;
    } else {
      throw new Error('Email send returned unsuccessful status');
    }
  } catch (error: any) {
    console.error('Bulk email error:', error);
    
    // Mark all as failed
    message.recipients.forEach((recipient: RecipientWithStatus) => {
      if (recipient.email) {
        recipient.status = MessageStatus.FAILED;
        recipient.error = error.message || 'Service error';
        message.failedSends++;
      }
    });
  }
}

export const getMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    // @ts-ignore - user is attached by auth middleware
    const userId = req.user._id;
    const { page = 1, limit = 20, type, status } = req.query;

    console.log('Fetching messages for user:', userId);

    const filter: any = { userId };
    if (type) filter.type = type;
    if (status) filter.status = status;

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Message.countDocuments(filter);

    console.log('Messages fetched:', { count: messages.length, total });

    res.json({
      success: true,
      data: messages,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const getMessageStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // @ts-ignore - user is attached by auth middleware
    const userId = req.user._id;

    console.log('Fetching message stats for user:', userId);

    const stats = await Message.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalMessages: { $sum: 1 },
          totalRecipients: { $sum: '$totalRecipients' },
          successfulSends: { $sum: '$successfulSends' },
          failedSends: { $sum: '$failedSends' },
          totalCost: { $sum: '$cost' }
        }
      }
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStats = await Message.aggregate([
      {
        $match: {
          userId,
          createdAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          todayMessages: { $sum: 1 },
          todayRecipients: { $sum: '$totalRecipients' }
        }
      }
    ]);

    console.log('Stats fetched successfully');

    res.json({
      success: true,
      data: {
        overall: stats[0] || {
          totalMessages: 0,
          totalRecipients: 0,
          successfulSends: 0,
          failedSends: 0,
          totalCost: 0
        },
        today: todayStats[0] || {
          todayMessages: 0,
          todayRecipients: 0
        }
      }
    });
  } catch (error: any) {
    console.error('Get message stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
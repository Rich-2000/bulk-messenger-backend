import { Request, Response } from 'express';
import Contact from '../models/Contact';
import { AppError } from '../middleware/errorHandler';

export const createContact = async (req: Request, res: Response): Promise<void> => {
  try {
    // @ts-ignore - user is attached by auth middleware
    const userId = req.user._id;
    const { name, phoneNumber, email, groups } = req.body;

    console.log('Creating contact:', { userId, name, phoneNumber, email });

    // Validate at least one contact method
    if (!phoneNumber && !email) {
      throw new AppError('Phone number or email is required', 400);
    }

    // Check for duplicate contact
    const existingContact = await Contact.findOne({
      userId,
      $or: [
        ...(phoneNumber ? [{ phoneNumber }] : []),
        ...(email ? [{ email }] : [])
      ]
    });

    if (existingContact) {
      throw new AppError('Contact already exists', 400);
    }

    const contact = new Contact({
      userId,
      name,
      phoneNumber,
      email,
      groups: groups || ['All']
    });

    await contact.save();

    console.log('Contact created successfully:', contact);

    res.status(201).json({
      success: true,
      message: 'Contact created successfully',
      data: contact
    });
  } catch (error: any) {
    console.error('Create contact error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message
    });
  }
};

export const importContacts = async (req: Request, res: Response): Promise<void> => {
  try {
    // @ts-ignore - user is attached by auth middleware
    const userId = req.user._id;
    const contacts = req.body;

    console.log('Importing contacts:', { userId, count: contacts.length });

    if (!Array.isArray(contacts)) {
      throw new AppError('Contacts must be an array', 400);
    }

    const importedContacts = [];
    const errors = [];

    for (const contactData of contacts) {
      try {
        const { name, phoneNumber, email, groups } = contactData;

        if (!name || (!phoneNumber && !email)) {
          errors.push({ contact: contactData, error: 'Missing required fields' });
          continue;
        }

        // Check for duplicate
        const existingContact = await Contact.findOne({
          userId,
          $or: [
            ...(phoneNumber ? [{ phoneNumber }] : []),
            ...(email ? [{ email }] : [])
          ]
        });

        if (existingContact) {
          errors.push({ contact: contactData, error: 'Duplicate contact' });
          continue;
        }

        const contact = new Contact({
          userId,
          name,
          phoneNumber,
          email,
          groups: groups || ['All']
        });

        await contact.save();
        importedContacts.push(contact);
      } catch (error: any) {
        errors.push({ contact: contactData, error: error.message });
      }
    }

    console.log('Import complete:', { imported: importedContacts.length, failed: errors.length });

    res.json({
      success: true,
      message: `Imported ${importedContacts.length} contacts successfully`,
      data: {
        imported: importedContacts.length,
        failed: errors.length,
        errors
      }
    });
  } catch (error: any) {
    console.error('Import contacts error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message
    });
  }
};

export const getContacts = async (req: Request, res: Response): Promise<void> => {
  try {
    // @ts-ignore - user is attached by auth middleware
    const userId = req.user._id;
    const { page = 1, limit = 50, group, search } = req.query;

    console.log('Fetching contacts for user:', userId);

    const filter: any = { userId };
    if (group) filter.groups = group;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const contacts = await Contact.find(filter)
      .sort({ name: 1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Contact.countDocuments(filter);

    // Get unique groups
    const groups = await Contact.distinct('groups', { userId });

    console.log('Contacts fetched:', { count: contacts.length, total });

    res.json({
      success: true,
      data: contacts,
      groups,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const updateContact = async (req: Request, res: Response): Promise<void> => {
  try {
    // @ts-ignore - user is attached by auth middleware
    const userId = req.user._id;
    const { id } = req.params;
    const updateData = req.body;

    console.log('Updating contact:', { id, userId, updateData });

    const contact = await Contact.findOneAndUpdate(
      { _id: id, userId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!contact) {
      throw new AppError('Contact not found', 404);
    }

    console.log('Contact updated successfully:', contact);

    res.json({
      success: true,
      message: 'Contact updated successfully',
      data: contact
    });
  } catch (error: any) {
    console.error('Update contact error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message
    });
  }
};

export const deleteContact = async (req: Request, res: Response): Promise<void> => {
  try {
    // @ts-ignore - user is attached by auth middleware
    const userId = req.user._id;
    const { id } = req.params;

    console.log('Deleting contact:', { id, userId });

    const contact = await Contact.findOneAndDelete({ _id: id, userId });

    if (!contact) {
      throw new AppError('Contact not found', 404);
    }

    console.log('Contact deleted successfully');

    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete contact error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message
    });
  }
};
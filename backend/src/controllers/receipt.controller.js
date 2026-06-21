import { Receipt, CarbonLog, User } from '../repositories/database.models.js';
import { extractReceiptData } from '../services/ocr.service.js';
import { calculateTransportEmission, calculateElectricityEmission, calculateTotalEmission } from '../services/calculation.service.js';

// Max file size limit: 4MB
const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];

export async function extractReceipt(req, res) {
  const { fileData, filename, mimeType } = req.body;
  const activeUserId = req.user.id;

  if (!fileData || !filename || !mimeType) {
    return res.status(400).json({ error: 'Bad Request', message: 'fileData (base64), filename, and mimeType are required.' });
  }

  // 1. Validate MIME Type
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return res.status(400).json({ error: 'Unsupported File Format', message: 'Only PDF, PNG, JPG, and JPEG files are supported.' });
  }

  // 2. Validate File Size
  const sizeBytes = Math.round((fileData.length * 3) / 4); // estimate base64 bytes
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return res.status(400).json({ error: 'File Too Large', message: 'File size must be under 4MB.' });
  }

  try {
    const buffer = Buffer.from(fileData, 'base64');
    
    // Call OCR extractor
    const extracted = await extractReceiptData(buffer, filename);

    // Save pending receipt record
    const receipt = await Receipt.create({
      user_id: activeUserId,
      filename,
      extracted_date: extracted.date || null,
      extracted_distance: extracted.distance || null,
      extracted_cost: extracted.cost || null,
      extracted_mode: extracted.transport_type || null,
      status: 'pending'
    });

    return res.status(200).json({
      message: 'Receipt parsed successfully',
      receiptId: receipt.id,
      extracted: {
        date: extracted.date || '',
        distance: extracted.distance !== undefined ? extracted.distance : '',
        cost: extracted.cost !== undefined ? extracted.cost : '',
        transport_type: extracted.transport_type || '',
        electricity_kwh: extracted.electricity_kwh !== undefined ? extracted.electricity_kwh : ''
      }
    });
  } catch (error) {
    console.error('Extract receipt error:', error);
    if (error.message === 'OCR service unavailable') {
      return res.status(503).json({ error: 'OCR service unavailable', message: 'Receipt extraction OCR service is currently unavailable.' });
    }
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

export async function confirmReceipt(req, res) {
  const { receiptId, date, distance, cost, transport_type, electricity_kwh } = req.body;
  const activeUserId = req.user.id;

  if (!receiptId || !date) {
    return res.status(400).json({ error: 'Bad Request', message: 'receiptId and date are required to confirm logs.' });
  }

  try {
    const receipt = await Receipt.findByPk(receiptId);
    if (!receipt) {
      return res.status(404).json({ error: 'Not Found', message: 'Receipt record not found.' });
    }

    // Check if both distance and transport mode are provided to calculate transport carbon
    const distVal = parseFloat(distance);
    let transportEmission = 0;
    if (!isNaN(distVal) && transport_type) {
      transportEmission = calculateTransportEmission(distVal, transport_type);
    }

    // Check if electricity consumption is provided
    const kwhVal = parseFloat(electricity_kwh);
    let electricityEmission = 0;
    if (!isNaN(kwhVal)) {
      electricityEmission = calculateElectricityEmission(kwhVal);
    }

    // Compute total emission
    const total = calculateTotalEmission(transportEmission, 0, electricityEmission, 0);

    // Save as CarbonLog
    const log = await CarbonLog.create({
      user_id: activeUserId,
      date,
      transport_emission: transportEmission,
      food_emission: 0,
      electricity_emission: electricityEmission,
      shopping_emission: 0,
      total_emission: total
    });

    // Mark receipt as confirmed
    receipt.status = 'confirmed';
    await receipt.save();

    return res.status(201).json({
      message: 'Receipt details confirmed and saved successfully',
      log
    });
  } catch (error) {
    console.error('Confirm receipt error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

export async function getReceiptHistory(req, res) {
  const activeUserId = req.user.id;

  try {
    const receipts = await Receipt.findAll({
      where: { user_id: activeUserId },
      order: [['created_at', 'DESC']]
    });
    return res.json(receipts);
  } catch (error) {
    console.error('Fetch receipts history error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

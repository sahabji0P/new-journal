# Receipts API

> **Audience**: Developers
> **Last Updated**: February 8, 2026

## Overview

Receipts are file attachments (images) linked to transactions for record-keeping and reimbursement.

## Endpoints

### GET /api/receipts
Returns all receipts for the user.

**Query Parameters**:
- `transactionId`: Filter by transaction

### POST /api/receipts
Uploads a new receipt.

**Request**: multipart/form-data
**Fields**:
- `file`: Receipt image file
- `transactionId`: (optional) Link to transaction
- `fileName`: Original filename
- `fileType`: MIME type

**Response**:
```json
{
  "id": "rec123",
  "userId": "user123",
  "transactionId": "txn456",
  "fileName": "receipt-2024-02-08.jpg",
  "fileUrl": "/uploads/receipts/abc123.jpg",
  "fileType": "image/jpeg",
  "fileSize": 245678,
  "uploadedAt": "2024-02-08T10:00:00.000Z"
}
```

### GET /api/receipts/[id]
Returns receipt metadata (not the file itself).

### DELETE /api/receipts/[id]
Deletes receipt file and metadata.

## File Constraints

- **Max Size**: 2MB
- **Allowed Types**: image/jpeg, image/png, image/webp
- **Storage**: Local filesystem or cloud storage

## Receipt Storage

Receipts are stored in `/public/uploads/receipts/` with unique filenames to prevent collisions.

## Integration with Transactions

Receipts can be attached during transaction creation or added later.

## Related Documentation
- [Transactions API](./transactions.md)
- [User Guide: Receipts](../user-guide/receipts.md)

---
